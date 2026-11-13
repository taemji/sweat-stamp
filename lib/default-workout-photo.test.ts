import { afterEach, describe, expect, it, vi } from "vitest";

import { loadDefaultWorkoutPhoto } from "./default-workout-photo";
import { getMemberProfile } from "./member-profiles";

describe("default workout photo", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the member's workout illustration as a file to stamp", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("image", { headers: { "Content-Type": "image/webp" } }));
    vi.stubGlobal("fetch", fetchMock);

    const photo = await loadDefaultWorkoutPhoto(getMemberProfile("yoom"));

    expect(fetchMock).toHaveBeenCalledWith("/characters/yoom-workout.webp");
    expect(photo.name).toBe("yoom-workout.webp");
    expect(photo.type).toBe("image/webp");
    expect(photo.size).toBeGreaterThan(0);
  });

  it("reports a Korean error when the illustration is missing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

    await expect(loadDefaultWorkoutPhoto(getMemberProfile("taem"))).rejects.toThrow("기본 운동 이미지를 불러오지 못했어요");
  });
});
