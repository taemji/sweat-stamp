import { isMemberId, type MemberId } from "./member-profiles";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase-client";

const photoBucketName = "certification-photos";

// Matches the char_length(routine) check in supabase/migrations.
export const MAX_ROUTINE_LENGTH = 120;
const pageSize = 1000;
const maxPages = 20;

interface CertificationRow {
  completed_at: string;
  member_id: string;
  photo_path: string;
  routine: string;
  workout_date: string;
}

export interface SharedCertification {
  completedAt: string;
  memberId: MemberId;
  photoPath: string;
  routine: string;
  workoutDate: string;
}

interface SaveSharedCertificationInput {
  completedAt: string;
  memberId: MemberId;
  photo: File;
  routine: string;
  workoutDate: string;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function mapCertificationRows(rows: CertificationRow[]) {
  return rows.flatMap((row): SharedCertification[] => {
    if (
      !isMemberId(row.member_id)
      || !isIsoDate(row.workout_date)
      || typeof row.routine !== "string"
      || typeof row.photo_path !== "string"
      || typeof row.completed_at !== "string"
    ) {
      return [];
    }

    return [{
      completedAt: row.completed_at,
      memberId: row.member_id,
      photoPath: row.photo_path,
      routine: row.routine,
      workoutDate: row.workout_date,
    }];
  });
}

function requireSupabaseClient() {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error("Supabase 환경변수가 설정되지 않았어요.");
  }

  return client;
}

export async function loadSharedCertifications() {
  const supabase = requireSupabaseClient();
  const rows: CertificationRow[] = [];

  // The API returns at most 1000 rows per request, so read newest first in pages.
  for (let page = 0; page < maxPages; page += 1) {
    const from = page * pageSize;
    const { data, error } = await supabase
      .from("certifications")
      .select("member_id, workout_date, routine, photo_path, completed_at")
      .order("workout_date", { ascending: false })
      .order("member_id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(error.message);
    }

    rows.push(...((data ?? []) as CertificationRow[]));

    if (!data || data.length < pageSize) {
      break;
    }
  }

  return mapCertificationRows(rows);
}

export async function saveSharedCertification(input: SaveSharedCertificationInput) {
  const supabase = requireSupabaseClient();
  const timestamp = input.completedAt.replace(/\D/g, "");
  const photoPath = `${input.memberId}/${input.workoutDate}/${timestamp}.jpg`;
  const photoBucket = supabase.storage.from(photoBucketName);
  const { error: uploadError } = await photoBucket.upload(photoPath, input.photo, {
    cacheControl: "31536000",
    contentType: input.photo.type || "image/jpeg",
    upsert: false,
  });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error: certificationError } = await supabase
    .from("certifications")
    .upsert({
      completed_at: input.completedAt,
      member_id: input.memberId,
      photo_path: photoPath,
      routine: input.routine,
      updated_at: new Date().toISOString(),
      workout_date: input.workoutDate,
    }, { onConflict: "member_id,workout_date" });

  if (certificationError) {
    await photoBucket.remove([photoPath]);
    throw new Error(certificationError.message);
  }

  // Remove earlier photos for the same member and day; the row now points at the new one.
  const dayFolder = `${input.memberId}/${input.workoutDate}`;
  const { data: dayFiles } = await photoBucket.list(dayFolder);
  const stalePaths = (dayFiles ?? [])
    .map((file) => `${dayFolder}/${file.name}`)
    .filter((path) => path !== photoPath);

  if (stalePaths.length > 0) {
    await photoBucket.remove(stalePaths);
  }

  return {
    completedAt: input.completedAt,
    memberId: input.memberId,
    photoPath,
    routine: input.routine,
    workoutDate: input.workoutDate,
  } satisfies SharedCertification;
}

export async function deleteSharedCertification(certification: Pick<SharedCertification, "memberId" | "photoPath" | "workoutDate">) {
  const supabase = requireSupabaseClient();
  const { error: deleteError } = await supabase
    .from("certifications")
    .delete()
    .eq("member_id", certification.memberId)
    .eq("workout_date", certification.workoutDate);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const { error: photoError } = await supabase.storage.from(photoBucketName).remove([certification.photoPath]);

  if (photoError) {
    throw new Error(photoError.message);
  }
}

export function getSharedPhotoUrl(photoPath: string, completedAt: string) {
  const supabase = requireSupabaseClient();
  const { data } = supabase.storage.from(photoBucketName).getPublicUrl(photoPath);
  const url = new URL(data.publicUrl);
  url.searchParams.set("v", completedAt);
  return url.toString();
}

export function subscribeToSharedCertifications(onChange: () => void) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = requireSupabaseClient();
  const channel = supabase
    .channel("shared-certifications")
    .on("postgres_changes", { event: "*", schema: "public", table: "certifications" }, onChange)
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}