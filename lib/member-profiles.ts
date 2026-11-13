export const MEMBER_PROFILES = [
  {
    id: "taem",
    name: "TAEM",
    character: "bunny",
    mainWorkout: "Ballet",
    subWorkout: "Stretching",
    portrait: "/characters/taem-portrait.webp",
    avatar: "/characters/taem-avatar.webp",
    workoutImage: "/characters/taem-workout.webp",
    accent: "#b84a62",
    accentSoft: "#fce6e8",
    panel: "#fff5f6",
    ink: "#3d1a22",
    message: "오늘도 발끝까지 우아하게.",
  },
  {
    id: "sam",
    name: "SAM",
    character: "koala",
    mainWorkout: "Pilates",
    subWorkout: "Stretching",
    portrait: "/characters/sam-portrait.webp",
    avatar: "/characters/sam-avatar.webp",
    workoutImage: "/characters/sam-workout.webp",
    accent: "#3a76ad",
    accentSoft: "#d7ebfd",
    panel: "#f3f9ff",
    ink: "#142c42",
    message: "코어부터 단단하게, 오늘도 완료.",
  },
  {
    id: "sook",
    name: "SOOK",
    character: "leopard",
    mainWorkout: "Pilates",
    subWorkout: "Stretching",
    portrait: "/characters/sook-portrait.webp",
    avatar: "/characters/sook-avatar.webp",
    workoutImage: "/characters/sook-workout.webp",
    accent: "#5f7352",
    accentSoft: "#e2ebe0",
    panel: "#f6f9f4",
    ink: "#1f2b1a",
    message: "꾸준히 쌓인 하루가 눈에 보여요.",
  },
  {
    id: "yoom",
    name: "YOOM",
    character: "fawn",
    mainWorkout: "Diet Dance",
    subWorkout: "Stretching",
    portrait: "/characters/yoom-portrait.webp",
    avatar: "/characters/yoom-avatar.webp",
    workoutImage: "/characters/yoom-workout.webp",
    accent: "#8a63bd",
    accentSoft: "#efe6fc",
    panel: "#faf6fe",
    ink: "#2e2040",
    message: "신나게 흔들고 땀 도장 쾅.",
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
