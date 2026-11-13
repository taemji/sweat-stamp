export const MEMBER_PROFILES = [
  {
    id: "taem",
    timeZone: "Asia/Seoul",
    name: "TAEM",
    mainWorkout: "Ballet",
    subWorkout: "Stretching",
    portrait: "/characters/taem-portrait.webp",
    avatar: "/characters/taem-avatar.webp",
    workoutImage: "/characters/taem-workout.webp",
    lineup: { src: "/characters/taem-lineup.webp", width: 247, height: 311 },
    accent: "#b84a62",
    accentSoft: "#fce6e8",
    ink: "#3d1a22",
  },
  {
    id: "sam",
    timeZone: "Australia/Sydney",
    name: "SAM",
    mainWorkout: "Pilates",
    subWorkout: "Stretching",
    portrait: "/characters/sam-portrait.webp",
    avatar: "/characters/sam-avatar.webp",
    workoutImage: "/characters/sam-workout.webp",
    lineup: { src: "/characters/sam-lineup.webp", width: 298, height: 233 },
    accent: "#3a76ad",
    accentSoft: "#d7ebfd",
    ink: "#142c42",
  },
  {
    id: "sook",
    timeZone: "Asia/Seoul",
    name: "SOOK",
    mainWorkout: "Pilates",
    subWorkout: "Stretching",
    portrait: "/characters/sook-portrait.webp",
    avatar: "/characters/sook-avatar.webp",
    workoutImage: "/characters/sook-workout.webp",
    lineup: { src: "/characters/sook-lineup.webp", width: 214, height: 288 },
    accent: "#5f7352",
    accentSoft: "#e2ebe0",
    ink: "#1f2b1a",
  },
  {
    id: "yoom",
    timeZone: "Asia/Seoul",
    name: "YOOM",
    mainWorkout: "Diet Dance",
    subWorkout: "Stretching",
    portrait: "/characters/yoom-portrait.webp",
    avatar: "/characters/yoom-avatar.webp",
    workoutImage: "/characters/yoom-workout.webp",
    lineup: { src: "/characters/yoom-lineup.webp", width: 186, height: 289 },
    accent: "#8a63bd",
    accentSoft: "#efe6fc",
    ink: "#2e2040",
  },
] as const;

export const TEAM_TIME_ZONE = "Asia/Seoul";

export const TEAM_THEME = {
  accent: "#94650f",
  accentSoft: "#fef1ca",
  ink: "#1c1a19",
} as const;

export type MemberProfile = (typeof MEMBER_PROFILES)[number];
export type MemberId = MemberProfile["id"];

const memberIds = new Set<string>(MEMBER_PROFILES.map((member) => member.id));

export function isMemberId(value: unknown): value is MemberId {
  return typeof value === "string" && memberIds.has(value);
}

export function getMemberProfile(memberId: MemberId) {
  return MEMBER_PROFILES.find((member) => member.id === memberId) ?? MEMBER_PROFILES[0];
}
