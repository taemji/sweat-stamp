export const MEMBER_PROFILES = [
  {
    id: "taem",
    name: "taem",
    initial: "T",
    character: "block",
    accent: "#e85d3f",
    accentSoft: "#ffe5dc",
    panel: "#fff8f5",
    ink: "#321b16",
    message: "오늘의 힘을 한 장으로 남겨요.",
  },
  {
    id: "saem",
    name: "saem",
    initial: "S",
    character: "drop",
    accent: "#247da0",
    accentSoft: "#dff2f8",
    panel: "#f5fbfd",
    ink: "#17313a",
    message: "나만의 리듬으로 오늘도 완료.",
  },
  {
    id: "yum",
    name: "yum",
    initial: "Y",
    character: "round",
    accent: "#d99a00",
    accentSoft: "#fff0b8",
    panel: "#fffaf0",
    ink: "#35290d",
    message: "작은 움직임도 빠짐없이 기록해요.",
  },
  {
    id: "ssuk",
    name: "ssuk",
    initial: "S",
    character: "sprout",
    accent: "#4d8048",
    accentSoft: "#e1efda",
    panel: "#f7fbf4",
    ink: "#1e301c",
    message: "꾸준히 쌓인 하루가 눈에 보여요.",
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