import { describe, expect, it } from "vitest";

import { MEMBER_PROFILES, getMemberProfile, isMemberId } from "./member-profiles";

describe("member profiles", () => {
  it("defines the four certification members in display order", () => {
    expect(MEMBER_PROFILES.map((member) => member.id)).toEqual(["taem", "saem", "yum", "ssuk"]);
  });

  it("gives every member an independent visual identity", () => {
    expect(new Set(MEMBER_PROFILES.map((member) => member.accent))).toHaveLength(4);
    expect(new Set(MEMBER_PROFILES.map((member) => member.character))).toHaveLength(4);
  });

  it("validates and resolves only known member ids", () => {
    expect(isMemberId("taem")).toBe(true);
    expect(isMemberId("unknown")).toBe(false);
    expect(getMemberProfile("ssuk").name).toBe("ssuk");
  });
});