import { describe, expect, it } from "vitest";

import { mapCertificationRows } from "./shared-certifications";

describe("shared certifications", () => {
  it("maps valid Supabase rows and rejects unknown members", () => {
    expect(mapCertificationRows([
      {
        completed_at: "2026-11-13T06:00:00.000Z",
        member_id: "sook",
        photo_path: "sook/2026-11-13/photo.jpg",
        routine: "수영",
        workout_date: "2026-11-13",
      },
      {
        completed_at: "2026-11-13T06:00:00.000Z",
        member_id: "unknown",
        photo_path: "unknown/2026-11-13/photo.jpg",
        routine: "운동",
        workout_date: "2026-11-13",
      },
    ])).toEqual([{
      completedAt: "2026-11-13T06:00:00.000Z",
      memberId: "sook",
      photoPath: "sook/2026-11-13/photo.jpg",
      routine: "수영",
      workoutDate: "2026-11-13",
    }]);
  });
});