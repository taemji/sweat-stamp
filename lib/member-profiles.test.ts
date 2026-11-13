import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { MEMBER_PROFILES, TEAM_THEME, getMemberProfile, isMemberId } from "./member-profiles";

function getRelativeLuminance(hexColor: string) {
  const [red, green, blue] = [1, 3, 5]
    .map((index) => parseInt(hexColor.slice(index, index + 2), 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function getContrastWithWhite(hexColor: string) {
  return 1.05 / (getRelativeLuminance(hexColor) + 0.05);
}

describe("member profiles", () => {
  it("defines the four certification members in display order", () => {
    expect(MEMBER_PROFILES.map((member) => member.id)).toEqual(["taem", "sam", "sook", "yoom"]);
    expect(MEMBER_PROFILES.map((member) => member.name)).toEqual(["TAEM", "SAM", "SOOK", "YOOM"]);
  });

  it("keeps SAM on Sydney time and everyone else on Seoul time", () => {
    expect(MEMBER_PROFILES.map((member) => member.timeZone)).toEqual(["Asia/Seoul", "Australia/Sydney", "Asia/Seoul", "Asia/Seoul"]);
  });

  it("presets each member's main and sub workout in English", () => {
    expect(MEMBER_PROFILES.map((member) => member.mainWorkout)).toEqual(["Ballet", "Pilates", "Pilates", "Diet Dance"]);
    expect(MEMBER_PROFILES.map((member) => member.subWorkout)).toEqual(["Stretching", "Stretching", "Stretching", "Stretching"]);
  });

  it("gives every member an independent visual identity", () => {
    for (const field of ["accent", "accentSoft", "portrait", "avatar", "workoutImage"] as const) {
      expect(new Set(MEMBER_PROFILES.map((member) => member[field]))).toHaveLength(4);
    }
    expect(new Set(MEMBER_PROFILES.map((member) => member.lineup.src))).toHaveLength(4);
  });

  it("keeps white text readable on every member accent", () => {
    for (const member of MEMBER_PROFILES) {
      expect(getContrastWithWhite(member.accent), member.name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps the team theme accent readable on its own background", () => {
    const contrast = (getRelativeLuminance(TEAM_THEME.accentSoft) + 0.05) / (getRelativeLuminance(TEAM_THEME.accent) + 0.05);

    expect(contrast).toBeGreaterThanOrEqual(4.5);
  });

  it("points every character image at a file in public", () => {
    for (const member of MEMBER_PROFILES) {
      for (const imagePath of [member.portrait, member.avatar, member.workoutImage, member.lineup.src]) {
        expect(existsSync(path.join(process.cwd(), "public", imagePath)), imagePath).toBe(true);
      }
    }
  });

  it("validates and resolves only known member ids", () => {
    expect(isMemberId("taem")).toBe(true);
    expect(isMemberId("saem")).toBe(false);
    expect(isMemberId("ssuk")).toBe(false);
    expect(isMemberId("yum")).toBe(false);
    expect(isMemberId("unknown")).toBe(false);
    expect(getMemberProfile("sook").name).toBe("SOOK");
  });

  it("records each lineup image at its real pixel size", async () => {
    const { default: sharp } = await import("sharp");

    for (const member of MEMBER_PROFILES) {
      const { width, height } = await sharp(path.join(process.cwd(), "public", member.lineup.src)).metadata();
      expect([width, height], member.name).toEqual([member.lineup.width, member.lineup.height]);
    }
  });
});
