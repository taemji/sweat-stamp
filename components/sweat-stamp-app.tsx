"use client";

import { useEffect, useRef, useState, type CSSProperties, type ChangeEvent } from "react";
import Image from "next/image";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CameraIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  WEEKDAY_LABELS,
  formatDayLabel,
  getLocalDateKey,
  getMonthCalendarDays,
  getWeekDateKeys,
  shiftMonth,
} from "@/lib/certification-calendar";
import {
  deleteCertificationPhoto,
  getCertificationPhoto,
  migrateCertificationPhotoKeys,
  saveCertificationPhoto,
} from "@/lib/certification-photo-store";
import { createDailyRoutines, readDailyRoutines } from "@/lib/daily-routines";
import { loadDefaultWorkoutPhoto } from "@/lib/default-workout-photo";
import { formatKoreanHeadcount, formatKoreanOrdinal } from "@/lib/korean-format";
import {
  MEMBER_PROFILES,
  TEAM_THEME,
  TEAM_TIME_ZONE,
  getMemberProfile,
  isMemberId,
  type MemberId,
} from "@/lib/member-profiles";
import {
  getLegacyPhotoKeys,
  migrateCertificationRecord,
  migrateMemberRecord,
  migrateSelectedMemberId,
} from "@/lib/member-id-migration";
import {
  deleteSharedCertification,
  getSharedPhotoUrl,
  loadSharedCertifications,
  saveSharedCertification,
  subscribeToSharedCertifications,
  type SharedCertification,
} from "@/lib/shared-certifications";
import { createStampedPhoto, formatStampDateTime, formatStampTime } from "@/lib/stamp-photo";
import { isSupabaseConfigured } from "@/lib/supabase-client";

interface Certification {
  completedAt: string;
  memberId: MemberId;
  photoPath?: string;
  routine: string;
}

type StoredCertification = Omit<Certification, "memberId"> & { memberId: string };

type CertificationMap = Record<string, Certification>;
type RoutineMap = Partial<Record<MemberId, string>>;
type AppView = "calendar" | MemberId;
type SyncStatus = "connecting" | "error" | "local" | "shared";

const selectedMemberStorageKey = "sweat-stamp:selected-member";
const routinesStorageKey = "sweat-stamp:routines";
const certificationsStorageKey = "sweat-stamp:certifications";

function getCertificationKey(memberId: MemberId, dateKey: string) {
  return `${dateKey}:${memberId}`;
}

function getStampFontFamily() {
  return getComputedStyle(document.documentElement).getPropertyValue("--font-bricolage").trim();
}

function readStoredObject<T extends object>(key: string): T | null {
  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) as T : null;
  } catch {
    return null;
  }
}

function mapSharedCertificationRecords(sharedCertifications: SharedCertification[]) {
  return Object.fromEntries(sharedCertifications.map((certification) => [
    getCertificationKey(certification.memberId, certification.workoutDate),
    {
      completedAt: certification.completedAt,
      memberId: certification.memberId,
      photoPath: certification.photoPath,
      routine: certification.routine,
    } satisfies Certification,
  ]));
}

interface CalendarOverviewProps {
  certifications: CertificationMap;
  todayKey: string;
  visibleMonth: Date;
  onChangeMonth: (offset: number) => void;
}

function CalendarOverview({
  certifications,
  todayKey,
  visibleMonth,
  onChangeMonth,
}: CalendarOverviewProps) {
  const calendarDays = getMonthCalendarDays(visibleMonth);
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(visibleMonth);

  return (
    <section className="stamp-sheet calendar-overview" aria-label="공동 인증 캘린더">
      <div className="calendar-heading">
        <div>
          <p className="calendar-eyebrow">Monthly stamps</p>
          <h2 className="calendar-month">{monthName} <span>{visibleMonth.getFullYear()}</span></h2>
        </div>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="icon" aria-label="이전 달" title="이전 달" onClick={() => onChangeMonth(-1)}>
            <ChevronLeftIcon />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="다음 달" title="다음 달" onClick={() => onChangeMonth(1)}>
            <ChevronRightIcon />
          </Button>
        </div>
      </div>

      <div className="calendar-board">
        <div className="calendar-weekdays" aria-hidden="true">
          {WEEKDAY_LABELS.map((weekday) => <span key={weekday}>{weekday}</span>)}
        </div>
        <div className="calendar-grid">
          {calendarDays.map((day, index) => {
            if (!day.dateKey || !day.dayNumber) {
              return <span key={`empty-${index}`} className="calendar-day calendar-day-empty" aria-hidden="true" />;
            }

            const completedMembers = MEMBER_PROFILES.filter((member) => certifications[getCertificationKey(member.id, day.dateKey!)]);
            const completedNames = completedMembers.map((member) => member.name).join(", ");
            const accessibleLabel = `${day.dayNumber}일, ${completedNames ? `${completedNames} 인증 완료` : "인증 없음"}`;

            return (
              <div key={day.dateKey} className="calendar-day" data-today={day.dateKey === todayKey} role="group" aria-label={accessibleLabel}>
                <span className="calendar-date">{day.dayNumber}</span>
                <span className="calendar-stamps" aria-hidden="true">
                  {completedMembers.map((member) => (
                    <i key={member.id} style={{ "--stamp-color": member.accent } as CSSProperties} />
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function SweatStampApp() {
  const usesSharedStorage = isSupabaseConfigured();
  const [activeView, setActiveView] = useState<AppView>("calendar");
  const [selectedMemberId, setSelectedMemberId] = useState<MemberId>("taem");
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const [year, month] = getLocalDateKey(new Date(), TEAM_TIME_ZONE).split("-").map(Number);
    return new Date(year, month - 1, 1);
  });
  const [now, setNow] = useState(() => new Date());
  const [routines, setRoutines] = useState<RoutineMap>({});
  const [certifications, setCertifications] = useState<CertificationMap>({});
  const [photoPreview, setPhotoPreview] = useState<{ file: File; stampedAt: Date; url: string } | null>(null);
  const [storedPhoto, setStoredPhoto] = useState<{ key: string; url: string } | null>(null);
  const [saveError, setSaveError] = useState("");
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(usesSharedStorage ? "connecting" : "local");
  const [hasHydrated, setHasHydrated] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const selectedMember = getMemberProfile(selectedMemberId);
  const teamTodayKey = getLocalDateKey(now, TEAM_TIME_ZONE);
  const todayKey = getLocalDateKey(now, selectedMember.timeZone);
  const certificationKey = getCertificationKey(selectedMemberId, todayKey);
  const completedCertification = certifications[certificationKey];
  const routineInput = routines[selectedMemberId] ?? selectedMember.mainWorkout;
  const routine = routineInput.trim();
  const workoutPresets: string[] = [selectedMember.mainWorkout, selectedMember.subWorkout];
  const isPresetRoutine = workoutPresets.includes(routine);
  const weekDays = getWeekDateKeys(todayKey).map((dateKey, index) => ({
    dateKey,
    isDone: Boolean(certifications[getCertificationKey(selectedMemberId, dateKey)]),
    isToday: dateKey === todayKey,
    label: WEEKDAY_LABELS[index],
  }));
  const weeklyStampCount = weekDays.filter((day) => day.isDone).length;
  const teamDayLabel = formatDayLabel(now, TEAM_TIME_ZONE);
  const memberDayLabel = formatDayLabel(now, selectedMember.timeZone);
  const memberCount = MEMBER_PROFILES.length;
  const todayDoneMembers = MEMBER_PROFILES.filter((member) => (
    certifications[getCertificationKey(member.id, getLocalDateKey(now, member.timeZone))]
  ));
  const todayDoneIds = new Set<MemberId>(todayDoneMembers.map((member) => member.id));
  const teamMonthPrefix = `${teamTodayKey.slice(0, 7)}-`;
  const monthlyCounts = new Map(MEMBER_PROFILES.map((member) => [
    member.id,
    Object.keys(certifications).filter((key) => key.startsWith(teamMonthPrefix) && key.endsWith(`:${member.id}`)).length,
  ]));
  const remainingMemberCount = memberCount - todayDoneMembers.length;
  const isStorageReady = hasHydrated && syncStatus !== "connecting";
  const syncNotice = syncStatus === "error" ? "공동 저장에 연결하지 못해 이 기기에만 저장돼요" : "";
  const loadingMessage = "오늘 기록을 불러오는 중이에요.";
  const canCertify = isStorageReady && !isProcessingPhoto;
  const isCalendarView = activeView === "calendar";
  const themeStyle = {
    "--member-accent": isCalendarView ? TEAM_THEME.accent : selectedMember.accent,
    "--member-tint": isCalendarView ? TEAM_THEME.accentSoft : selectedMember.accentSoft,
    "--member-ink": isCalendarView ? TEAM_THEME.ink : selectedMember.ink,
  } as CSSProperties;

  useEffect(() => {
    let isActive = true;
    const frameId = window.requestAnimationFrame(async () => {
      const storedMemberId = window.localStorage.getItem(selectedMemberStorageKey);
      const todaysRoutines = readDailyRoutines(readStoredObject(routinesStorageKey), getLocalDateKey());
      const storedCertifications = readStoredObject<Record<string, StoredCertification>>(certificationsStorageKey);
      const migratedMemberId = migrateSelectedMemberId(storedMemberId);
      const migratedCertifications = migrateCertificationRecord(storedCertifications ?? {}) as CertificationMap;

      if (isMemberId(migratedMemberId)) {
        setSelectedMemberId(migratedMemberId);
      }

      setRoutines(migrateMemberRecord(todaysRoutines) as RoutineMap);

      if (storedCertifications) {
        await migrateCertificationPhotoKeys(getLegacyPhotoKeys(Object.keys(migratedCertifications))).catch(() => undefined);
      }

      let nextCertifications = migratedCertifications;

      if (usesSharedStorage) {
        try {
          nextCertifications = mapSharedCertificationRecords(await loadSharedCertifications());
          if (isActive) {
            setSyncStatus("shared");
          }
        } catch {
          if (isActive) {
            setSyncStatus("error");
          }
        }
      }

      if (!isActive) {
        return;
      }

      setCertifications(nextCertifications);

      setHasHydrated(true);
    });

    return () => {
      isActive = false;
      window.cancelAnimationFrame(frameId);
    };
  }, [usesSharedStorage]);

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    window.localStorage.setItem(selectedMemberStorageKey, selectedMemberId);
    window.localStorage.setItem(routinesStorageKey, JSON.stringify(createDailyRoutines(routines as Record<string, string>, getLocalDateKey())));
    window.localStorage.setItem(certificationsStorageKey, JSON.stringify(certifications));
  }, [certifications, hasHydrated, routines, selectedMemberId]);

  useEffect(() => {
    if (syncStatus !== "shared") {
      return;
    }

    return subscribeToSharedCertifications(() => {
      void loadSharedCertifications()
        .then((sharedCertifications) => setCertifications(mapSharedCertificationRecords(sharedCertifications)))
        .catch(() => setSyncStatus("error"));
    }) ?? undefined;
  }, [syncStatus]);

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview.url);
      }
    };
  }, [photoPreview]);

  useEffect(() => {
    let photoUrl = "";
    let isActive = true;

    if (!completedCertification) {
      return;
    }

    if (completedCertification.photoPath && syncStatus === "shared") {
      const remotePhotoUrl = getSharedPhotoUrl(completedCertification.photoPath, completedCertification.completedAt);
      void Promise.resolve().then(() => {
        if (isActive) {
          setStoredPhoto({ key: certificationKey, url: remotePhotoUrl });
        }
      });

      return () => {
        isActive = false;
      };
    }

    void getCertificationPhoto(certificationKey)
      .then((photo) => {
        if (!photo || !isActive) {
          return;
        }

        photoUrl = URL.createObjectURL(photo);
        setStoredPhoto({ key: certificationKey, url: photoUrl });
      })
      .catch(() => {
        if (isActive) {
          setStoredPhoto(null);
        }
      });

    return () => {
      isActive = false;

      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
    };
  }, [certificationKey, completedCertification, syncStatus]);

  function stampForSelectedMember(photo: File, stampedAt: Date) {
    return createStampedPhoto(photo, {
      accent: selectedMember.accent,
      fontFamily: getStampFontFamily(),
      memberName: selectedMember.name,
      stampedAt,
      timeZone: selectedMember.timeZone,
    });
  }

  function selectMember(memberId: MemberId) {
    setSelectedMemberId(memberId);
    setActiveView(memberId);
    setPhotoPreview(null);
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const stampedAt = new Date();
    setIsProcessingPhoto(true);
    setSaveError("");

    try {
      const stampedPhoto = await stampForSelectedMember(file, stampedAt);
      setPhotoPreview({ file: stampedPhoto, stampedAt, url: URL.createObjectURL(stampedPhoto) });
    } catch (error) {
      setPhotoPreview(null);
      setSaveError(error instanceof Error ? error.message : "사진을 처리하지 못했어요.");
    } finally {
      setIsProcessingPhoto(false);
    }
  }

  function updateRoutine(nextRoutine: string) {
    setRoutines((currentRoutines) => {
      const nextRoutines = { ...currentRoutines };

      if (nextRoutine.trim()) {
        nextRoutines[selectedMemberId] = nextRoutine;
      } else {
        delete nextRoutines[selectedMemberId];
      }

      return nextRoutines;
    });
  }

  function clearPhoto() {
    setPhotoPreview(null);
  }

  async function certifyToday() {
    if (!canCertify) {
      return;
    }

    setIsSaving(true);
    setSaveError("");

    try {
      let certificationPhoto = photoPreview;

      if (!certificationPhoto) {
        const stampedAt = new Date();
        const stampedPhoto = await stampForSelectedMember(await loadDefaultWorkoutPhoto(selectedMember), stampedAt);
        certificationPhoto = { file: stampedPhoto, stampedAt, url: "" };
      }

      const nextCertification: Certification = {
        completedAt: certificationPhoto.stampedAt.toISOString(),
        memberId: selectedMemberId,
        routine,
      };

      if (syncStatus === "shared") {
        const savedCertification = await saveSharedCertification({
          ...nextCertification,
          photo: certificationPhoto.file,
          workoutDate: todayKey,
        });
        nextCertification.photoPath = savedCertification.photoPath;
      } else {
        await saveCertificationPhoto(certificationKey, certificationPhoto.file);
      }

      setCertifications((currentCertifications) => ({
        ...currentCertifications,
        [certificationKey]: nextCertification,
      }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "사진을 저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function resetCertification() {
    setSaveError("");

    if (completedCertification?.photoPath && syncStatus !== "shared") {
      setSaveError("공동 저장에 연결된 뒤 다시 시도해 주세요.");
      return;
    }

    try {
      if (completedCertification?.photoPath) {
        await deleteSharedCertification({
          completedAt: completedCertification.completedAt,
          memberId: completedCertification.memberId,
          photoPath: completedCertification.photoPath,
          routine: completedCertification.routine,
          workoutDate: todayKey,
        });
      } else {
        await deleteCertificationPhoto(certificationKey).catch(() => undefined);
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "인증 기록을 삭제하지 못했어요.");
      return;
    }

    setCertifications((currentCertifications) => {
      const nextCertifications = { ...currentCertifications };
      delete nextCertifications[certificationKey];
      return nextCertifications;
    });
    setPhotoPreview(null);
  }

  return (
    <main className="stamp-shell" style={themeStyle}>
      <div className="stamp-frame">
        <header className="stamp-header">
          <div className="min-w-0">
            <h1 className="stamp-wordmark">Sweat Stamp</h1>
            {syncNotice && <p className="stamp-meta" role="status">{syncNotice}</p>}
          </div>
        </header>

        <nav className="member-nav" aria-label="화면 선택">
          {MEMBER_PROFILES.map((member) => {
            const isSelected = member.id === activeView;
            const isComplete = todayDoneIds.has(member.id);

            return (
              <button
                key={member.id}
                type="button"
                className="member-chip"
                data-selected={isSelected}
                style={{ "--chip-accent": member.accent } as CSSProperties}
                aria-label={`${member.name} 선택`}
                aria-pressed={isSelected}
                onClick={() => selectMember(member.id)}
              >
                <Image className="member-chip-avatar" src={member.avatar} alt="" width={64} height={64} priority />
                {isSelected && <span className="member-chip-name">{member.name}</span>}
                {isComplete && (
                  <span className="member-chip-done">
                    <CheckIcon aria-label="인증 완료" />
                  </span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            className="calendar-chip"
            data-selected={isCalendarView}
            aria-label="전체 캘린더"
            aria-pressed={isCalendarView}
            onClick={() => setActiveView("calendar")}
          >
            <CalendarDaysIcon aria-hidden="true" />
          </button>
        </nav>

        {isCalendarView ? (
          <>
            <section className="stamp-hero team-hero" aria-labelledby="team-heading">
              <div className="hero-copy">
                <p className="hero-date">{teamDayLabel}</p>
                <h2 id="team-heading" className="hero-title">
                  {!isStorageReady
                    ? <>오늘의<br />도장</>
                    : todayDoneMembers.length === 0
                    ? <>오늘 첫 도장은<br />누가 찍을까요</>
                    : remainingMemberCount === 0
                      ? <>오늘은 모두<br />해냈어요</>
                      : <>{memberCount}명 중 {todayDoneMembers.length}명이<br />도장 찍었어요</>}
                  <span className="hero-dot">{isStorageReady && todayDoneMembers.length === 0 ? "?" : "."}</span>
                </h2>
                <p className="hero-line">
                  {!isStorageReady
                    ? loadingMessage
                    : todayDoneMembers.length === 0
                    ? `${formatKoreanHeadcount(memberCount)} 모두 아직이에요.`
                    : remainingMemberCount === 0
                      ? `${formatKoreanHeadcount(memberCount)} 모두 도장을 찍었어요.`
                      : `남은 ${formatKoreanHeadcount(remainingMemberCount)}도 같이 가 볼까요?`}
                </p>
              </div>
              <div className="team-lineup" role="group" aria-label={isStorageReady ? `오늘 ${todayDoneMembers.length}명 인증` : "네 멤버"} data-loading={!isStorageReady}>
                {MEMBER_PROFILES.map((member) => {
                  const isDone = todayDoneIds.has(member.id);

                  return (
                    <button
                      key={member.id}
                      type="button"
                      className="team-lineup-member"
                      data-done={isDone}
                      style={{ flexGrow: member.lineup.width }}
                      aria-label={`${member.name} ${isDone ? "오늘 인증 완료" : "오늘 인증 전"}, 이번 달 ${monthlyCounts.get(member.id)}회, 인증 화면 열기`}
                      onClick={() => selectMember(member.id)}
                    >
                      <Image
                        src={member.lineup.src}
                        alt=""
                        width={member.lineup.width}
                        height={member.lineup.height}
                        priority
                      />
                      <span className="team-lineup-count" style={{ "--chip-accent": member.accent } as CSSProperties} aria-hidden="true">
                        {isStorageReady ? `${monthlyCounts.get(member.id)}회` : "\u00a0"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
            <CalendarOverview
              certifications={certifications}
              todayKey={teamTodayKey}
              visibleMonth={visibleMonth}
              onChangeMonth={(offset) => setVisibleMonth((currentMonth) => shiftMonth(currentMonth, offset))}
            />
          </>
        ) : (
          <>
            <section className="stamp-hero" aria-labelledby="member-heading">
              <Image
                key={selectedMember.id}
                className="member-hero-character"
                src={selectedMember.portrait}
                alt={`${selectedMember.name} 캐릭터`}
                width={600}
                height={800}
                sizes="15rem"
                priority
              />
              <div className="hero-copy">
                <p className="hero-date">{memberDayLabel}{completedCertification ? " · DONE" : ""}</p>
                {!isStorageReady ? (
                  <>
                    <h2 id="member-heading" className="hero-title">
                      안녕,<br /><span className="font-display">{selectedMember.name}</span><span className="hero-dot">.</span>
                    </h2>
                    <p className="hero-line">{loadingMessage}</p>
                  </>
                ) : completedCertification ? (
                  <>
                    <h2 id="member-heading" className="hero-title">오늘도<br />해냈어요<span className="hero-dot">.</span></h2>
                    <p className="hero-line">
                      <b>{selectedMember.name}</b>의 이번 주<br />{formatKoreanOrdinal(weeklyStampCount)} 도장이에요.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 id="member-heading" className="hero-title">
                      안녕,<br /><span className="font-display">{selectedMember.name}</span><span className="hero-dot">.</span>
                    </h2>
                    <p className="hero-line">
                      오늘 <b>{routine}</b> 하고<br />도장 하나 찍어 볼까요?
                    </p>
                  </>
                )}
              </div>
              {isStorageReady && (
                <div className="hero-panel" role="group" aria-label={`이번 주 ${weeklyStampCount}회 인증`}>
                  <p className="hero-panel-head" aria-hidden="true">
                    <span>This week</span>
                    <span>{weeklyStampCount} / 7</span>
                  </p>
                  <ol className="week-strip-days" aria-hidden="true">
                    {weekDays.map((day) => (
                      <li key={day.dateKey} data-done={day.isDone} data-today={day.isToday}>
                        <i />
                        <small>{day.label}</small>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </section>

            {!isStorageReady ? (
              <section className="stamp-sheet" aria-busy="true">
                <p className="sheet-loading">{loadingMessage}</p>
              </section>
            ) : completedCertification ? (
              <section className="stamp-sheet certification-complete" aria-live="polite">
                {storedPhoto?.key === certificationKey && (
                  <div
                    className="completed-photo"
                    style={{ backgroundImage: `url(${storedPhoto.url})` }}
                    role="img"
                    aria-label={`${selectedMember.name}의 오늘 운동 사진`}
                  />
                )}
                <div className="complete-summary">
                  <div className="min-w-0">
                    <p className="complete-routine">{completedCertification.routine}</p>
                    <p className="complete-caption">{formatStampTime(new Date(completedCertification.completedAt), selectedMember.timeZone)}에 찍은 도장</p>
                  </div>
                  <button type="button" className="complete-retry" onClick={resetCertification}>
                    <RotateCcwIcon aria-hidden="true" />
                    다시 인증
                  </button>
                </div>
                {saveError && <p className="text-sm font-medium text-destructive" role="alert">{saveError}</p>}
              </section>
            ) : (
              <section className="stamp-sheet" aria-label="오늘 인증">
                <div className="workout-list" role="group" aria-label="운동 빠르게 선택">
                  {workoutPresets.map((workout) => {
                    const isPicked = routine === workout;

                    return (
                      <button
                        key={workout}
                        type="button"
                        className="workout-row"
                        aria-pressed={isPicked}
                        onClick={() => updateRoutine(workout)}
                      >
                        <strong className="workout-row-label">{workout}</strong>
                        <span className="workout-row-mark" aria-hidden="true">{isPicked && <CheckIcon />}</span>
                      </button>
                    );
                  })}
                  <label className="workout-row workout-row-custom" htmlFor="daily-routine">
                    <input
                      id="daily-routine"
                      type="text"
                      value={isPresetRoutine ? "" : routineInput}
                      placeholder="직접 입력"
                      aria-label="오늘의 운동"
                      onChange={(event) => updateRoutine(event.target.value)}
                    />
                  </label>
                </div>

                <input
                  ref={photoInputRef}
                  className="sr-only"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  aria-label="운동 사진 선택"
                  onChange={handlePhotoChange}
                />

                <div className="photo-frame">
                  {photoPreview ? (
                    <div className="photo-tile" style={{ backgroundImage: `url(${photoPreview.url})` }} role="img" aria-label={`${selectedMember.name} 운동 인증 미리보기`} />
                  ) : (
                    <div className="photo-tile">
                      <Image
                        src={selectedMember.workoutImage}
                        alt={`${selectedMember.name} 기본 인증 이미지`}
                        width={1080}
                        height={1080}
                        sizes="(max-width: 480px) 100vw, 440px"
                      />
                      <span className="photo-tile-band" aria-hidden="true">
                        <strong><i />Sweat Stamp</strong>
                        <small>{selectedMember.name} · {formatStampDateTime(now, selectedMember.timeZone)}</small>
                      </span>
                    </div>
                  )}
                  <div className="photo-actions">
                    {photoPreview && (
                      <button type="button" className="photo-clear" aria-label="사진 지우기" title="사진 지우기" onClick={clearPhoto}>
                        <XIcon />
                      </button>
                    )}
                    <button type="button" className="photo-picker" disabled={isProcessingPhoto} onClick={() => photoInputRef.current?.click()}>
                      <CameraIcon aria-hidden="true" />
                      {isProcessingPhoto ? "인증 정보 넣는 중" : photoPreview ? "다시 찍기" : "내 사진으로 바꾸기"}
                    </button>
                  </div>
                </div>

                {saveError && <p className="text-sm font-medium text-destructive" role="alert">{saveError}</p>}

                <button type="button" className="certify-button" disabled={!canCertify || isSaving} onClick={certifyToday}>
                  <span>{isSaving ? "도장 찍는 중" : `오늘 ${routine} 완료 · 도장 찍기`}</span>
                  <span className="certify-button-icon" aria-hidden="true"><ArrowRightIcon /></span>
                </button>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
