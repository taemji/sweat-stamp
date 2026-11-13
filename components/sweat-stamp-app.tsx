"use client";

import { useEffect, useRef, useState, type CSSProperties, type ChangeEvent } from "react";
import { CameraIcon, CheckIcon, ImagePlusIcon, RotateCcwIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  deleteCertificationPhoto,
  getCertificationPhoto,
  saveCertificationPhoto,
} from "@/lib/certification-photo-store";
import {
  MEMBER_PROFILES,
  getMemberProfile,
  isMemberId,
  type MemberId,
} from "@/lib/member-profiles";

interface Certification {
  completedAt: string;
  memberId: MemberId;
  photoName: string;
  routine: string;
}

type CertificationMap = Record<string, Certification>;
type RoutineMap = Partial<Record<MemberId, string>>;

const selectedMemberStorageKey = "sweat-stamp:selected-member";
const routinesStorageKey = "sweat-stamp:routines";
const certificationsStorageKey = "sweat-stamp:certifications";

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCertificationKey(memberId: MemberId, dateKey: string) {
  return `${dateKey}:${memberId}`;
}

function readStoredObject<T extends object>(key: string): T | null {
  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) as T : null;
  } catch {
    return null;
  }
}

export function SweatStampApp() {
  const [selectedMemberId, setSelectedMemberId] = useState<MemberId>("taem");
  const [routines, setRoutines] = useState<RoutineMap>({});
  const [certifications, setCertifications] = useState<CertificationMap>({});
  const [routineChecked, setRoutineChecked] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<{ file: File; url: string } | null>(null);
  const [storedPhoto, setStoredPhoto] = useState<{ key: string; url: string } | null>(null);
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const selectedMember = getMemberProfile(selectedMemberId);
  const todayKey = getLocalDateKey();
  const certificationKey = getCertificationKey(selectedMemberId, todayKey);
  const completedCertification = certifications[certificationKey];
  const routine = routines[selectedMemberId] ?? "";
  const formattedDate = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());
  const canCertify = routine.trim().length > 0 && routineChecked && photoPreview !== null;
  const themeStyle = {
    "--member-accent": selectedMember.accent,
    "--member-accent-soft": selectedMember.accentSoft,
    "--member-panel": selectedMember.panel,
    "--member-ink": selectedMember.ink,
  } as CSSProperties;

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const storedMemberId = window.localStorage.getItem(selectedMemberStorageKey);
      const storedRoutines = readStoredObject<RoutineMap>(routinesStorageKey);
      const storedCertifications = readStoredObject<CertificationMap>(certificationsStorageKey);

      if (isMemberId(storedMemberId)) {
        setSelectedMemberId(storedMemberId);
      }

      if (storedRoutines) {
        setRoutines(storedRoutines);
      }

      if (storedCertifications) {
        setCertifications(storedCertifications);
      }

      setHasHydrated(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    window.localStorage.setItem(selectedMemberStorageKey, selectedMemberId);
    window.localStorage.setItem(routinesStorageKey, JSON.stringify(routines));
    window.localStorage.setItem(certificationsStorageKey, JSON.stringify(certifications));
  }, [certifications, hasHydrated, routines, selectedMemberId]);

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
  }, [certificationKey, completedCertification]);

  function selectMember(memberId: MemberId) {
    setSelectedMemberId(memberId);
    setRoutineChecked(false);
    setPhotoPreview(null);
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setPhotoPreview({ file, url: URL.createObjectURL(file) });
    setSaveError("");
    event.target.value = "";
  }

  function clearPhoto() {
    setPhotoPreview(null);
  }

  async function certifyToday() {
    if (!canCertify || !photoPreview) {
      return;
    }

    setIsSaving(true);
    setSaveError("");

    try {
      await saveCertificationPhoto(certificationKey, photoPreview.file);
      setCertifications((currentCertifications) => ({
        ...currentCertifications,
        [certificationKey]: {
          completedAt: new Date().toISOString(),
          memberId: selectedMemberId,
          photoName: photoPreview.file.name,
          routine: routine.trim(),
        },
      }));
    } catch {
      setSaveError("사진을 저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function resetCertification() {
    await deleteCertificationPhoto(certificationKey).catch(() => undefined);
    setCertifications((currentCertifications) => {
      const nextCertifications = { ...currentCertifications };
      delete nextCertifications[certificationKey];
      return nextCertifications;
    });
    setRoutineChecked(false);
    setPhotoPreview(null);
  }

  return (
    <main className="stamp-shell min-h-svh text-[var(--member-ink)]" style={themeStyle}>
      <section className="mx-auto flex min-h-svh w-full max-w-[480px] flex-col px-5 pb-8 pt-5">
        <header className="flex items-center justify-between gap-4 pb-5">
          <div>
            <h1 className="stamp-wordmark">땀도장</h1>
            <p className="mt-1 text-xs font-medium text-black/45">{formattedDate}</p>
          </div>
          <div className="flex items-center gap-1.5" aria-label="오늘 인증 수">
            <strong className="text-lg">{MEMBER_PROFILES.filter((member) => certifications[getCertificationKey(member.id, todayKey)]).length}</strong>
            <span className="text-sm text-black/40">/ 4</span>
          </div>
        </header>

        <nav className="grid grid-cols-4 gap-2" aria-label="멤버 선택">
          {MEMBER_PROFILES.map((member) => {
            const isSelected = member.id === selectedMemberId;
            const isComplete = Boolean(certifications[getCertificationKey(member.id, todayKey)]);

            return (
              <button
                key={member.id}
                type="button"
                className="member-tab"
                data-selected={isSelected}
                style={{ "--tab-accent": member.accent, "--tab-soft": member.accentSoft } as CSSProperties}
                aria-label={`${member.name} 선택`}
                aria-pressed={isSelected}
                onClick={() => selectMember(member.id)}
              >
                <span className="member-tab-avatar">{member.initial}</span>
                <span className="truncate text-xs font-bold">{member.name}</span>
                {isComplete && <CheckIcon className="member-tab-check" aria-label="인증 완료" />}
              </button>
            );
          })}
        </nav>

        <section className="member-stage mt-4" aria-labelledby="member-heading">
          <div className="flex items-center justify-between gap-5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase text-black/40">Today&apos;s mover</p>
              <h2 id="member-heading" className="mt-2 text-4xl font-black leading-none">{selectedMember.name}</h2>
              <p className="mt-3 max-w-[15rem] text-sm font-medium leading-6 text-black/55">{selectedMember.message}</p>
            </div>
            <div className={`member-character member-character-${selectedMember.character}`} aria-label={`${selectedMember.name} 캐릭터`}>
              <span className="member-character-body">
                <span className="member-character-initial">{selectedMember.initial}</span>
                <span className="member-character-eyes" aria-hidden="true"><i /><i /></span>
                <span className="member-character-mouth" aria-hidden="true" />
              </span>
              <span className="member-character-shadow" aria-hidden="true" />
            </div>
          </div>
        </section>

        {completedCertification ? (
          <section className="certification-complete mt-4 flex flex-1 flex-col items-center justify-center px-6 py-12 text-center" aria-live="polite">
            {storedPhoto?.key === certificationKey && (
              <div
                className="completed-photo"
                style={{ backgroundImage: `url(${storedPhoto.url})` }}
                role="img"
                aria-label={`${selectedMember.name}의 오늘 운동 사진`}
              />
            )}
            <div className="stamp-mark" aria-hidden="true">
              <CheckIcon />
              <span>DONE</span>
            </div>
            <p className="mt-7 text-sm font-bold text-black/45">{completedCertification.routine}</p>
            <h2 className="mt-2 text-3xl font-black">오늘 인증 완료</h2>
            <p className="mt-3 text-sm text-black/45">{selectedMember.name}의 도장이 찍혔어요.</p>
            <Button type="button" variant="ghost" className="mt-8 gap-2" onClick={resetCertification}>
              <RotateCcwIcon />
              다시 인증하기
            </Button>
          </section>
        ) : (
          <section className="certification-panel mt-4 flex flex-col gap-4 p-5">
            <label className="block" htmlFor="daily-routine">
              <span className="text-xs font-bold text-black/45">오늘의 운동</span>
              <input
                id="daily-routine"
                className="routine-input mt-2"
                type="text"
                value={routine}
                placeholder={`${selectedMember.name}의 운동을 입력하세요`}
                onChange={(event) => setRoutines((currentRoutines) => ({
                  ...currentRoutines,
                  [selectedMemberId]: event.target.value,
                }))}
              />
            </label>

            <button
              type="button"
              className="routine-check"
              data-checked={routineChecked}
              aria-pressed={routineChecked}
              onClick={() => setRoutineChecked((isChecked) => !isChecked)}
            >
              <span className="routine-check-box"><CheckIcon /></span>
              <span className="text-left">
                <strong className="block text-sm">운동 완료</strong>
                <span className="mt-0.5 block text-xs text-black/45">오늘 루틴을 마쳤어요</span>
              </span>
            </button>

            <input
              ref={photoInputRef}
              className="sr-only"
              type="file"
              accept="image/*"
              capture="environment"
              aria-label="운동 사진 선택"
              onChange={handlePhotoChange}
            />

            {photoPreview ? (
              <div className="photo-preview" style={{ backgroundImage: `url(${photoPreview.url})` }} role="img" aria-label={`${selectedMember.name} 운동 인증 미리보기`}>
                <button type="button" className="photo-clear" aria-label="사진 지우기" title="사진 지우기" onClick={clearPhoto}>
                  <XIcon />
                </button>
                <span className="photo-name">{photoPreview.file.name}</span>
              </div>
            ) : (
              <button type="button" className="photo-picker" onClick={() => photoInputRef.current?.click()}>
                <span className="photo-picker-icon"><CameraIcon /></span>
                <strong>운동 사진 찍기</strong>
                <span>카메라 또는 앨범</span>
              </button>
            )}

            {saveError && <p className="text-sm font-medium text-destructive" role="alert">{saveError}</p>}

            <Button type="button" size="lg" className="h-14 gap-2 bg-[var(--member-accent)] text-white hover:bg-[var(--member-accent)]/90" disabled={!canCertify || isSaving} onClick={certifyToday}>
              <ImagePlusIcon />
              {isSaving ? "사진 저장 중" : "오늘 인증 남기기"}
            </Button>
          </section>
        )}

        <section className="mt-5" aria-label="오늘 인증 현황">
          <div className="grid grid-cols-4 gap-2">
            {MEMBER_PROFILES.map((member) => {
              const isComplete = Boolean(certifications[getCertificationKey(member.id, todayKey)]);

              return (
                <button
                  key={member.id}
                  type="button"
                  className="status-tile"
                  data-complete={isComplete}
                  style={{ "--status-accent": member.accent, "--status-soft": member.accentSoft } as CSSProperties}
                  aria-label={`${member.name} ${isComplete ? "인증 완료" : "인증 전"}`}
                  onClick={() => selectMember(member.id)}
                >
                  <span>{member.name}</span>
                  <strong>{isComplete ? "완료" : "대기"}</strong>
                </button>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}