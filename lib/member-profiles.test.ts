import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { MEMBER_PROFILES, getMemberProfile, isMemberId } from "./member-profiles";

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

  it("presets each member's main and sub workout in English", () => {
    expect(MEMBER_PROFILES.map((member) => member.mainWorkout)).toEqual(["Ballet", "Pilates", "Pilates", "Diet Dance"]);
    expect(MEMBER_PROFILES.map((member) => member.subWorkout)).toEqual(["Stretching", "Stretching", "Stretching", "Stretching"]);
  });

  it("gives every member an independent visual identity", () => {
    for (const field of ["accent", "character", "portrait", "avatar", "workoutImage"] as const) {
      expect(new Set(MEMBER_PROFILES.map((member) => member[field]))).toHaveLength(4);
    }
  });

  it("keeps white text readable on every member accent", () => {
    for (const member of MEMBER_PROFILES) {
      expect(getContrastWithWhite(member.accent), member.name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("points every character image at a file in public", () => {
    for (const member of MEMBER_PROFILES) {
      for (const imagePath of [member.portrait, member.avatar, member.workoutImage]) {
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
});
