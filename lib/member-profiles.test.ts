import { describe, expect, it } from "vitest";

import { MEMBER_PROFILES, getMemberProfile, isMemberId } from "./member-profiles";

describe("member profiles", () => {
  it("defines the four certification members in display order", () => {
    expect(MEMBER_PROFILES.map((member) => member.id)).toEqual(["taem", "sam", "sook", "yoom"]);
    expect(MEMBER_PROFILES.map((member) => member.name)).toEqual(["TAEM", "SAM", "SOOK", "YOOM"]);
    expect(MEMBER_PROFILES.map((member) => member.accent)).toEqual(["#d94b42", "#f4d600", "#65a94b", "#8c63c7"]);
  });

  it("gives every member an independent visual identity", () => {
    expect(new Set(MEMBER_PROFILES.map((member) => member.accent))).toHaveLength(4);
    expect(new Set(MEMBER_PROFILES.map((member) => member.character))).toHaveLength(4);
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