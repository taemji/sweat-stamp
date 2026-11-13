import type { MemberProfile } from "@/lib/member-profiles";

export async function loadDefaultWorkoutPhoto(member: Pick<MemberProfile, "id" | "workoutImage">) {
  let response: Response;

  try {
    response = await fetch(member.workoutImage);
  } catch {
    throw new Error("기본 운동 이미지를 불러오지 못했어요. 연결을 확인해 주세요.");
  }

  if (!response.ok) {
    throw new Error("기본 운동 이미지를 불러오지 못했어요. 다시 시도해 주세요.");
  }

  const photo = await response.blob();
  return new File([photo], `${member.id}-workout.webp`, { type: photo.type || "image/webp" });
}
