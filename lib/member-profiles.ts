export const MEMBER_PROFILES = [
  {
    id: "taem",
    name: "TAEM",
    character: "block",
    accent: "#d94b42",
    accentSoft: "#ffe1dd",
    panel: "#fff7f5",
    ink: "#391715",
    message: "오늘의 힘을 한 장으로 남겨요.",
  },
  {
    id: "sam",
    name: "SAM",
    character: "drop",
    accent: "#f4d600",
    accentSoft: "#fff5a8",
    panel: "#fffdeb",
    ink: "#302900",
    message: "나만의 리듬으로 오늘도 완료.",
  },
  {
    id: "ssuk",
    name: "SSUK",
    character: "sprout",
    accent: "#65a94b",
    accentSoft: "#e1f2d7",
    panel: "#f7fbf3",
    ink: "#20351b",
    message: "꾸준히 쌓인 하루가 눈에 보여요.",
  },
  {
    id: "yoom",
    name: "YOOM",
    character: "round",
    accent: "#8c63c7",
    accentSoft: "#eee3fa",
    panel: "#faf7fd",
    ink: "#2e2040",
    message: "작은 움직임도 빠짐없이 기록해요.",
  },
] as const;

export type MemberProfile = (typeof MEMBER_PROFILES)[number];
export type MemberId = MemberProfile["id"];

const memberIds = new Set<string>(MEMBER_PROFILES.map((member) => member.id));

export function isMemberId(value: unknown): value is MemberId {
  return typeof value === "string" && memberIds.has(value);
}

export function getMemberProfile(memberId: MemberId) {
  return MEMBER_PROFILES.find((member) => member.id === memberId) ?? MEMBER_PROFILES[0];
}