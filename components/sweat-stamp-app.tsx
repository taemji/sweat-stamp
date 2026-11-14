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
  countCertificationsInMonth,
  formatDayLabel,
  formatKoreanDate,
  getCertificationKey,
  getLocalDateKey,
  getMonthCalendarDays,
  getMonthStart,
  getWeekDateKeys,
  parseCertificationKey,
  shiftMonth,
} from "@/lib/certification-calendar";
import {
  deleteCertificationPhoto,
  getCertificationPhoto,
  migrateCertificationPhotoKeys,
  saveCertificationPhoto,
} from "@/lib/certification-photo-store";
import { shouldUploadPending, withTimeout } from "@/lib/certification-sync";
import { createDailyRoutines, readDailyCustomIds, readDailyRoutines } from "@/lib/daily-routines";
import { loadDefaultWorkoutPhoto } from "@/lib/default-workout-photo";
import { formatKoreanHeadcount, formatKoreanOrdinal } from "@/lib/korean-format";
import {
  MEMBER_PROFILES,
  TEAM_THEME,
  TEAM_TIME_ZONE,
  getMemberProfile,
  isMemberId,
  type MemberId,
  type MemberProfile,
} from "@/lib/member-profiles";
import {
  getLegacyPhotoKeys,
  migrateCertificationRecord,
  migrateMemberRecord,
  migrateSelectedMemberId,
} from "@/lib/member-id-migration";
import {
  MAX_ROUTINE_LENGTH,
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
  // Set for certifications stored in shared storage.
  photoPath?: string;
  // Set for certifications saved on this device while shared storage was unreachable.
  pendingUpload?: boolean;
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
const loadingMessage = "오늘 기록을 불러오는 중이에요.";
const offlineNotice = "인터넷 연결이 불안정해요. 지금 찍는 도장은 친구들에게 아직 안 보여요.";
const sharedLoadTimeoutMs = 10_000;
const syncRetryMs = 30_000;

function getStampFontFamily() {
  return getComputedStyle(document.documentElement).getPropertyValue("--font-bricolage").trim();
}

function readStoredText(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readStoredObject<T extends object>(key: string): T | null {
  try {
    const storedValue = readStoredText(key);
    return storedValue ? JSON.parse(storedValue) as T : null;
  } catch {
    return null;
  }
}

function writeStoredText(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be full or blocked; the app keeps working from memory.
  }
}

function mapSharedCertificationRecords(sharedCertifications: SharedCertification[]): CertificationMap {
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

function pickPendingCertifications(certifications: CertificationMap): CertificationMap {
  return Object.fromEntries(Object.entries(certifications).filter(([, certification]) => certification.pendingUpload));
}

function pickDeviceCertifications(certifications: CertificationMap): CertificationMap {
  return Object.fromEntries(Object.entries(certifications).filter(([, certification]) => !certification.photoPath));
}

interface CertificationPhotoUrl {
  url: string;
  isObjectUrl: boolean;
}

// Shared photos have a public URL; photos kept on the device are read from IndexedDB.
async function loadCertificationPhotoUrl(key: string, certification: Certification): Promise<CertificationPhotoUrl | null> {
  if (certification.photoPath) {
    return { url: getSharedPhotoUrl(certification.photoPath, certification.completedAt), isObjectUrl: false };
  }

  const photo = await getCertificationPhoto(key).catch(() => null);
  return photo ? { url: URL.createObjectURL(photo), isObjectUrl: true } : null;
}

function releasePhotoUrl(photoUrl: CertificationPhotoUrl | null | undefined) {
  if (photoUrl?.isObjectUrl) {
    URL.revokeObjectURL(photoUrl.url);
  }
}

function stampPhotoForMember(member: MemberProfile, photo: File, stampedAt: Date) {
  return createStampedPhoto(photo, {
    accent: member.accent,
    fontFamily: getStampFontFamily(),
    memberName: member.name,
    stampedAt,
    timeZone: member.timeZone,
  });
}

interface CalendarOverviewProps {
  certifications: CertificationMap;
  todayKey: string;
  visibleMonth: Date;
  onChangeMonth: (offset: number) => void;
  onOpenDay: (dateKey: string) => void;
}

function CalendarOverview({
  certifications,
  todayKey,
  visibleMonth,
  onChangeMonth,
  onOpenDay,
}: CalendarOverviewProps) {
  const calendarDays = getMonthCalendarDays(visibleMonth);
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(visibleMonth);

  return (
    <section className="stamp-sheet calendar-overview" aria-label="도장 캘린더">
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
              <button
                key={day.dateKey}
                type="button"
                className="calendar-day"
                data-today={day.dateKey === todayKey}
                aria-label={`${accessibleLabel}, 인증 사진 보기`}
                disabled={day.dateKey > todayKey && completedMembers.length === 0}
                onClick={() => onOpenDay(day.dateKey!)}
              >
                <span className="calendar-date">{day.dayNumber}</span>
                <span className="calendar-stamps" aria-hidden="true">
                  {completedMembers.map((member) => (
                    <i key={member.id} style={{ "--stamp-color": member.accent } as CSSProperties} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

interface DayStampsProps {
  certifications: CertificationMap;
  dateKey: string;
  onBack: () => void;
  onSelectMember: (memberId: MemberId) => void;
}

function DayStamps({ certifications, dateKey, onBack, onSelectMember }: DayStampsProps) {
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [zoomedPhoto, setZoomedPhoto] = useState<{ caption: string; member: MemberProfile; url: string } | null>(null);
  const lightboxRef = useRef<HTMLDialogElement>(null);
  const photoCacheRef = useRef(new Map<string, CertificationPhotoUrl & { signature: string }>());
  const dateLabel = formatKoreanDate(dateKey);
  const entries = MEMBER_PROFILES.map((member) => {
    const key = getCertificationKey(member.id, dateKey);
    return { certification: certifications[key], key, member };
  });
  const doneCount = entries.filter((entry) => entry.certification).length;

  useEffect(() => {
    let isActive = true;
    const cache = photoCacheRef.current;

    async function loadPhotos() {
      const nextUrls: Record<string, string> = {};
      const shownKeys = new Set<string>();

      for (const member of MEMBER_PROFILES) {
        const key = getCertificationKey(member.id, dateKey);
        const certification = certifications[key];

        if (!certification) {
          continue;
        }

        const signature = `${certification.completedAt}|${certification.photoPath ?? ""}`;
        let cached = cache.get(key);
        shownKeys.add(key);

        if (!cached || cached.signature !== signature) {
          releasePhotoUrl(cached);
          cache.delete(key);
          const photoUrl = await loadCertificationPhotoUrl(key, certification);

          if (!isActive) {
            releasePhotoUrl(photoUrl);
            return;
          }

          if (!photoUrl) {
            continue;
          }

          cached = { ...photoUrl, signature };
          cache.set(key, cached);
        }

        nextUrls[key] = cached.url;
      }

      for (const [key, cached] of cache) {
        if (!shownKeys.has(key)) {
          releasePhotoUrl(cached);
          cache.delete(key);
        }
      }

      if (isActive) {
        setPhotoUrls(nextUrls);
      }
    }

    void loadPhotos();

    return () => {
      isActive = false;
    };
  }, [certifications, dateKey]);

  useEffect(() => {
    const cache = photoCacheRef.current;

    return () => {
      cache.forEach((cached) => releasePhotoUrl(cached));
      cache.clear();
    };
  }, []);

  useEffect(() => {
    const lightbox = lightboxRef.current;

    if (zoomedPhoto && lightbox && !lightbox.open) {
      lightbox.showModal();
    }
  }, [zoomedPhoto]);

  return (
    <section className="stamp-sheet day-stamps" aria-labelledby="day-heading">
      <div className="day-stamps-head">
        <button type="button" className="day-back" aria-label="캘린더로 돌아가기" onClick={onBack}>
          <ChevronLeftIcon aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <p className="calendar-eyebrow">Daily stamps</p>
          <h2 id="day-heading" className="calendar-month">{dateLabel}</h2>
        </div>
        <p className="day-count" aria-label={`${MEMBER_PROFILES.length}명 중 ${doneCount}명 인증`}>
          {doneCount} / {MEMBER_PROFILES.length}
        </p>
      </div>

      <ul className="day-grid">
        {entries.map(({ certification, key, member }) => (
          <li
            key={member.id}
            className="day-card"
            data-done={Boolean(certification)}
            style={{ "--card-accent": member.accent, "--card-tint": member.accentSoft } as CSSProperties}
          >
            {certification && photoUrls[key] ? (
              <button
                type="button"
                className="day-photo-button"
                aria-label={`${member.name} 인증 사진 크게 보기`}
                onClick={() => setZoomedPhoto({
                  caption: `${certification.routine} · ${formatStampTime(new Date(certification.completedAt), member.timeZone)}`,
                  member,
                  url: photoUrls[key],
                })}
              >
                <div
                  className="day-photo"
                  style={{ backgroundImage: `url(${photoUrls[key]})` }}
                  role="img"
                  aria-label={`${member.name} ${dateLabel} 인증 사진`}
                />
              </button>
            ) : (
              <div className="day-photo day-photo-empty" data-done={Boolean(certification)} aria-hidden="true">
                <Image src={member.portrait} alt="" width={600} height={800} sizes="(max-width: 480px) 50vw, 220px" />
              </div>
            )}
            <button type="button" className="day-card-meta" aria-label={`${member.name} 화면 열기, ${certification ? "인증 완료" : "아직 인증 전"}`} onClick={() => onSelectMember(member.id)}>
              <strong>{member.name}</strong>
              <span>
                {certification
                  ? `${certification.routine} · ${formatStampTime(new Date(certification.completedAt), member.timeZone)}`
                  : "Not yet"}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={lightboxRef}
        className="photo-lightbox"
        aria-label={zoomedPhoto ? `${zoomedPhoto.member.name} ${dateLabel} 인증 사진` : undefined}
        onClose={() => setZoomedPhoto(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            event.currentTarget.close();
          }
        }}
      >
        {zoomedPhoto && (
          <div className="photo-lightbox-body" style={{ "--card-accent": zoomedPhoto.member.accent } as CSSProperties}>
            <button type="button" className="photo-lightbox-close" aria-label="닫기" onClick={() => lightboxRef.current?.close()}>
              <XIcon aria-hidden="true" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element -- the popup sizes itself to each photo's own ratio */}
            <img
              className="photo-lightbox-image"
              src={zoomedPhoto.url}
              alt={`${zoomedPhoto.member.name} ${dateLabel} 인증 사진 확대`}
            />
            <p className="photo-lightbox-caption">
              <strong>{zoomedPhoto.member.name}</strong>
              <span>{zoomedPhoto.caption}</span>
            </p>
          </div>
        )}
      </dialog>
    </section>
  );
}

export function SweatStampApp() {
  const usesSharedStorage = isSupabaseConfigured();
  const [activeView, setActiveView] = useState<AppView>("calendar");
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<MemberId>("taem");
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthStart(getLocalDateKey(new Date(), TEAM_TIME_ZONE)));
  const [now, setNow] = useState(() => new Date());
  const [routines, setRoutines] = useState<RoutineMap>({});
  const [customRoutineIds, setCustomRoutineIds] = useState<ReadonlySet<MemberId>>(new Set());
  const [certifications, setCertifications] = useState<CertificationMap>({});
  const [photoPreview, setPhotoPreview] = useState<{ file: File; stampedAt: Date; url: string } | null>(null);
  const [storedPhoto, setStoredPhoto] = useState<{ key: string; url: string } | null>(null);
  const [saveError, setSaveError] = useState("");
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(usesSharedStorage ? "connecting" : "local");
  const [hasHydrated, setHasHydrated] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const selectedMemberIdRef = useRef<MemberId>(selectedMemberId);
  const certificationsRef = useRef<CertificationMap>({});
  const syncStateRef = useRef({ running: false, again: false });
  const syncRef = useRef<() => Promise<void>>(async () => undefined);
  const deviceDayRef = useRef(getLocalDateKey());

  const selectedMember = getMemberProfile(selectedMemberId);
  const teamTodayKey = getLocalDateKey(now, TEAM_TIME_ZONE);
  const todayKey = getLocalDateKey(now, selectedMember.timeZone);
  const certificationKey = getCertificationKey(selectedMemberId, todayKey);
  const completedCertification = certifications[certificationKey];
  const completedPhotoKey = completedCertification ? `${certificationKey}@${completedCertification.completedAt}` : "";
  const storedRoutine = routines[selectedMemberId];
  const routine = (storedRoutine ?? selectedMember.mainWorkout).trim();
  const workoutPresets: string[] = [selectedMember.mainWorkout, selectedMember.subWorkout];
  const isCustomRoutine = customRoutineIds.has(selectedMemberId) || !workoutPresets.includes(routine);
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
  // Team status (navigation checks, greeting, character row) counts the team day in Seoul,
  // the same day the calendar marks as today.
  const todayDoneMembers = MEMBER_PROFILES.filter((member) => certifications[getCertificationKey(member.id, teamTodayKey)]);
  const todayDoneIds = new Set<MemberId>(todayDoneMembers.map((member) => member.id));
  const certificationKeys = Object.keys(certifications);
  const visibleMonthNumber = visibleMonth.getMonth() + 1;
  const remainingMemberCount = memberCount - todayDoneMembers.length;
  const isStorageReady = hasHydrated && syncStatus !== "connecting";
  const isTeamStatusKnown = isStorageReady && syncStatus !== "error";
  const hasPendingUploads = Object.values(certifications).some((certification) => certification.pendingUpload);
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
      const migratedMemberId = migrateSelectedMemberId(readStoredText(selectedMemberStorageKey));
      const storedRoutines = readStoredObject(routinesStorageKey);
      const todaysRoutines = readDailyRoutines(storedRoutines, getLocalDateKey());
      const todaysCustomIds = readDailyCustomIds(storedRoutines, getLocalDateKey()).filter(isMemberId);
      const storedCertifications = readStoredObject<Record<string, StoredCertification>>(certificationsStorageKey);
      const migratedCertifications = migrateCertificationRecord(storedCertifications ?? {}) as CertificationMap;
      // Shared records cached by older versions are only a copy of the server; read the server instead.
      const deviceCertifications = pickDeviceCertifications(migratedCertifications);

      if (isMemberId(migratedMemberId)) {
        selectedMemberIdRef.current = migratedMemberId;
        setSelectedMemberId(migratedMemberId);
      }

      setRoutines(migrateMemberRecord(todaysRoutines) as RoutineMap);
      setCustomRoutineIds(new Set(todaysCustomIds));

      if (storedCertifications) {
        await migrateCertificationPhotoKeys(getLegacyPhotoKeys(Object.keys(migratedCertifications))).catch(() => undefined);
      }

      if (!isActive) {
        return;
      }

      certificationsRef.current = deviceCertifications;
      setCertifications(deviceCertifications);
      setHasHydrated(true);

      if (usesSharedStorage) {
        void syncRef.current();
      }
    });

    return () => {
      isActive = false;
      window.cancelAnimationFrame(frameId);
    };
  }, [usesSharedStorage]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      const nextNow = new Date();
      const deviceDay = getLocalDateKey(nextNow);

      setNow(nextNow);

      if (deviceDay !== deviceDayRef.current) {
        deviceDayRef.current = deviceDay;
        setRoutines({});
        setCustomRoutineIds(new Set());
      }
    }, 60_000);

    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    writeStoredText(selectedMemberStorageKey, selectedMemberId);
    writeStoredText(routinesStorageKey, JSON.stringify(createDailyRoutines(routines as Record<string, string>, deviceDayRef.current, customRoutineIds)));
    writeStoredText(certificationsStorageKey, JSON.stringify(pickDeviceCertifications(certifications)));
  }, [certifications, customRoutineIds, hasHydrated, routines, selectedMemberId]);

  useEffect(() => {
    certificationsRef.current = certifications;
  }, [certifications]);

  useEffect(() => {
    syncRef.current = runSync;
  });

  useEffect(() => {
    if (!usesSharedStorage || !hasHydrated) {
      return;
    }

    return subscribeToSharedCertifications(() => {
      void syncRef.current();
    }) ?? undefined;
  }, [hasHydrated, usesSharedStorage]);

  useEffect(() => {
    if (!usesSharedStorage || !hasHydrated || (syncStatus !== "error" && !hasPendingUploads)) {
      return;
    }

    const retry = () => void syncRef.current();
    const timerId = window.setInterval(retry, syncRetryMs);
    window.addEventListener("online", retry);

    return () => {
      window.clearInterval(timerId);
      window.removeEventListener("online", retry);
    };
  }, [hasHydrated, hasPendingUploads, syncStatus, usesSharedStorage]);

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview.url);
      }
    };
  }, [photoPreview]);

  useEffect(() => {
    let loadedPhoto: CertificationPhotoUrl | null = null;
    let isActive = true;

    if (!completedCertification) {
      return;
    }

    void loadCertificationPhotoUrl(certificationKey, completedCertification).then((photoUrl) => {
      if (!isActive) {
        releasePhotoUrl(photoUrl);
        return;
      }

      loadedPhoto = photoUrl;
      setStoredPhoto(photoUrl ? { key: completedPhotoKey, url: photoUrl.url } : null);
    });

    return () => {
      isActive = false;
      releasePhotoUrl(loadedPhoto);
    };
  }, [certificationKey, completedCertification, completedPhotoKey]);

  async function syncOnce() {
    const pendingSnapshot = pickPendingCertifications(certificationsRef.current);
    let sharedCertifications: CertificationMap;

    try {
      sharedCertifications = mapSharedCertificationRecords(
        await withTimeout(loadSharedCertifications(), sharedLoadTimeoutMs),
      );
    } catch {
      setSyncStatus("error");
      return;
    }

    setCertifications((currentCertifications) => ({
      ...sharedCertifications,
      ...pickPendingCertifications(currentCertifications),
    }));
    setSyncStatus("shared");

    const resolved: CertificationMap = {};
    const discarded: string[] = [];

    for (const [key, certification] of Object.entries(pendingSnapshot)) {
      if (!shouldUploadPending(certification, sharedCertifications[key])) {
        await deleteCertificationPhoto(key).catch(() => undefined);
        discarded.push(key);
        continue;
      }

      try {
        const photo = await getCertificationPhoto(key);

        if (!photo) {
          continue;
        }

        const saved = await saveSharedCertification({
          completedAt: certification.completedAt,
          memberId: certification.memberId,
          photo: new File([photo], `${certification.memberId}-stamped.jpg`, { type: photo.type || "image/jpeg" }),
          routine: certification.routine,
          workoutDate: parseCertificationKey(key).dateKey,
        });
        resolved[key] = {
          completedAt: certification.completedAt,
          memberId: certification.memberId,
          photoPath: saved.photoPath,
          routine: certification.routine,
        };
        await deleteCertificationPhoto(key).catch(() => undefined);
      } catch {
        // Stays pending; the retry loop tries again.
      }
    }

    if (discarded.length > 0 || Object.keys(resolved).length > 0) {
      setCertifications((currentCertifications) => {
        const nextCertifications = { ...currentCertifications, ...resolved };

        for (const key of discarded) {
          if (sharedCertifications[key]) {
            nextCertifications[key] = sharedCertifications[key];
          }
        }

        return nextCertifications;
      });
    }
  }

  // One sync at a time; a request made during a sync runs once more after it.
  async function runSync() {
    const syncState = syncStateRef.current;

    if (syncState.running) {
      syncState.again = true;
      return;
    }

    syncState.running = true;

    try {
      do {
        syncState.again = false;
        await syncOnce();
      } while (syncState.again);
    } finally {
      syncState.running = false;
    }
  }

  function selectMember(memberId: MemberId) {
    selectedMemberIdRef.current = memberId;
    setSelectedMemberId(memberId);
    setActiveView(memberId);
    setOpenDay(null);
    setPhotoPreview(null);
    setSaveError("");
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const member = selectedMember;
    const stampedAt = new Date();
    setIsProcessingPhoto(true);
    setSaveError("");

    try {
      const stampedPhoto = await stampPhotoForMember(member, file, stampedAt);

      // The member may have switched screens while the photo was being stamped.
      if (selectedMemberIdRef.current === member.id) {
        setPhotoPreview({ file: stampedPhoto, stampedAt, url: URL.createObjectURL(stampedPhoto) });
      }
    } catch (error) {
      if (selectedMemberIdRef.current === member.id) {
        setPhotoPreview(null);
        setSaveError(error instanceof Error ? error.message : "사진을 처리하지 못했어요.");
      }
    } finally {
      setIsProcessingPhoto(false);
    }
  }

  function updateRoutine(nextRoutine: string, source: "preset" | "custom") {
    const isEmpty = !nextRoutine.trim();

    setRoutines((currentRoutines) => {
      const nextRoutines = { ...currentRoutines };

      if (isEmpty) {
        delete nextRoutines[selectedMemberId];
      } else {
        nextRoutines[selectedMemberId] = nextRoutine;
      }

      return nextRoutines;
    });
    setCustomRoutineIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (source === "custom" && !isEmpty) {
        nextIds.add(selectedMemberId);
      } else {
        nextIds.delete(selectedMemberId);
      }

      return nextIds;
    });
  }

  function clearPhoto() {
    setPhotoPreview(null);
  }

  async function certifyToday() {
    if (!canCertify) {
      return;
    }

    const member = selectedMember;
    setIsSaving(true);
    setSaveError("");

    try {
      const certifiedAt = new Date();
      let certificationPhoto = photoPreview;

      if (!certificationPhoto) {
        const stampedPhoto = await stampPhotoForMember(member, await loadDefaultWorkoutPhoto(member), certifiedAt);
        certificationPhoto = { file: stampedPhoto, stampedAt: certifiedAt, url: "" };
      }

      // The workout date is the member's date on the stamp, so the photo and the record always agree.
      const workoutDate = getLocalDateKey(certificationPhoto.stampedAt, member.timeZone);
      const key = getCertificationKey(member.id, workoutDate);
      const nextCertification: Certification = {
        completedAt: certificationPhoto.stampedAt.toISOString(),
        memberId: member.id,
        routine,
      };
      let savedToServer = false;

      if (syncStatus === "shared") {
        try {
          const savedCertification = await saveSharedCertification({
            ...nextCertification,
            photo: certificationPhoto.file,
            workoutDate,
          });
          nextCertification.photoPath = savedCertification.photoPath;
          savedToServer = true;
        } catch {
          setSyncStatus("error");
        }
      }

      if (!savedToServer) {
        await saveCertificationPhoto(key, certificationPhoto.file);
        nextCertification.pendingUpload = usesSharedStorage || undefined;
      }

      setNow(certifiedAt);
      setCertifications((currentCertifications) => ({
        ...currentCertifications,
        [key]: nextCertification,
      }));
      setPhotoPreview(null);

      if (savedToServer) {
        void syncRef.current();
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "사진을 저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function resetCertification() {
    setSaveError("");

    if (!completedCertification) {
      return;
    }

    if (completedCertification.photoPath && syncStatus !== "shared") {
      setSaveError("인터넷에 다시 연결된 뒤 시도해 주세요.");
      return;
    }

    try {
      if (completedCertification.photoPath) {
        await deleteSharedCertification({
          memberId: completedCertification.memberId,
          photoPath: completedCertification.photoPath,
          workoutDate: todayKey,
        });
        void syncRef.current();
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
    setStoredPhoto(null);
    setPhotoPreview(null);
  }

  return (
    <main className="stamp-shell" style={themeStyle}>
      <div className="stamp-frame">
        <header className="stamp-header">
          <div className="min-w-0">
            <h1 className="stamp-wordmark">Sweat Stamp</h1>
            {syncStatus === "error" && <p className="stamp-meta" role="status">{offlineNotice}</p>}
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
                aria-label={`${member.name} 선택${isComplete ? ", 오늘 인증 완료" : ""}`}
                aria-pressed={isSelected}
                onClick={() => selectMember(member.id)}
              >
                <Image className="member-chip-avatar" src={member.avatar} alt="" width={64} height={64} priority />
                {isSelected && <span className="member-chip-name">{member.name}</span>}
                {isComplete && (
                  <span className="member-chip-done" aria-hidden="true">
                    <CheckIcon />
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
            onClick={() => {
              setActiveView("calendar");
              setOpenDay(null);
            }}
          >
            <CalendarDaysIcon aria-hidden="true" />
          </button>
        </nav>

        {isCalendarView && openDay ? (
          <DayStamps
            certifications={certifications}
            dateKey={openDay}
            onBack={() => setOpenDay(null)}
            onSelectMember={selectMember}
          />
        ) : isCalendarView ? (
          <>
            <section className="stamp-hero team-hero" aria-labelledby="team-heading">
              <div className="hero-copy">
                <p className="hero-date">{teamDayLabel}</p>
                <h2 id="team-heading" className="hero-title">
                  {!isTeamStatusKnown
                    ? <>오늘의<br />도장</>
                    : todayDoneMembers.length === 0
                      ? <>오늘 첫 도장은<br />누가 찍을까요</>
                      : remainingMemberCount === 0
                        ? <>오늘은 모두<br />해냈어요</>
                        : <>{memberCount}명 중 {todayDoneMembers.length}명이<br />도장 찍었어요</>}
                  <span className="hero-dot">{isTeamStatusKnown && todayDoneMembers.length === 0 ? "?" : "."}</span>
                </h2>
                <p className="hero-line">
                  {!isStorageReady
                    ? loadingMessage
                    : !isTeamStatusKnown
                      ? "친구들 기록을 불러오지 못했어요."
                      : todayDoneMembers.length === 0
                      ? `${formatKoreanHeadcount(memberCount)} 모두 아직이에요.`
                      : remainingMemberCount === 0
                        ? `${formatKoreanHeadcount(memberCount)} 모두 도장을 찍었어요.`
                        : `남은 ${formatKoreanHeadcount(remainingMemberCount)}도 같이 가 볼까요?`}
                </p>
              </div>
              <div
                className="team-lineup"
                role="group"
                aria-label={isTeamStatusKnown ? `오늘 ${todayDoneMembers.length}명 인증` : `${memberCount}명의 멤버`}
                data-loading={!isTeamStatusKnown}
              >
                {MEMBER_PROFILES.map((member) => {
                  const isDone = todayDoneIds.has(member.id);
                  const monthlyCount = countCertificationsInMonth(certificationKeys, member.id, visibleMonth);

                  return (
                    <button
                      key={member.id}
                      type="button"
                      className="team-lineup-member"
                      data-done={isDone}
                      style={{ flexGrow: member.lineup.width }}
                      aria-label={`${member.name} ${isDone ? "오늘 인증 완료" : "오늘 인증 전"}, ${visibleMonthNumber}월 ${monthlyCount}회, 인증 화면 열기`}
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
                        {isTeamStatusKnown ? `${monthlyCount}회` : " "}
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
              onOpenDay={setOpenDay}
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
                      오늘 <b className="hero-workout">{routine}</b> 하고<br />도장 하나 찍어 볼까요?
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
                {storedPhoto?.key === completedPhotoKey && (
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
                    const isPicked = !isCustomRoutine && routine === workout;

                    return (
                      <button
                        key={workout}
                        type="button"
                        className="workout-row"
                        aria-pressed={isPicked}
                        onClick={() => updateRoutine(workout, "preset")}
                      >
                        <strong className="workout-row-label">{workout}</strong>
                        <span className="workout-row-mark" aria-hidden="true">{isPicked && <CheckIcon />}</span>
                      </button>
                    );
                  })}
                  <label className="workout-row workout-row-custom" htmlFor="daily-routine" data-selected={isCustomRoutine}>
                    <input
                      id="daily-routine"
                      type="text"
                      value={isCustomRoutine ? storedRoutine ?? "" : ""}
                      placeholder="직접 입력"
                      maxLength={MAX_ROUTINE_LENGTH}
                      aria-label="오늘의 운동"
                      onChange={(event) => updateRoutine(event.target.value, "custom")}
                    />
                    <span className="workout-row-mark" aria-hidden="true">{isCustomRoutine && <CheckIcon />}</span>
                  </label>
                </div>

                <input
                  ref={photoInputRef}
                  className="sr-only"
                  type="file"
                  accept="image/*"
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
                  <span className="certify-button-label">{isSaving ? "도장 찍는 중" : `오늘 ${routine} 완료 · 도장 찍기`}</span>
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
