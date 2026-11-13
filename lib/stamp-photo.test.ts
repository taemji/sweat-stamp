import { describe, expect, it } from "vitest";

import { formatStampDateTime, formatStampTime } from "./stamp-photo";

describe("stamp photo", () => {
  it("formats the certification date and time in Korean local time", () => {
    const formatted = formatStampDateTime(new Date(2026, 10, 13, 18, 7));

    expect(formatted).toContain("2026");
    expect(formatted).toContain("11");
    expect(formatted).toContain("13");
    expect(formatted).toContain("오후 6:07");
  });

  it("formats the stamp time as a Korean clock time", () => {
    expect(formatStampTime(new Date(2026, 10, 13, 18, 7))).toBe("오후 6:07");
    expect(formatStampTime(new Date(2026, 10, 13, 2, 28))).toBe("오전 2:28");
  });

  it("formats stamp times in the member's time zone", () => {
    const stampedAt = new Date("2026-11-14T00:07:00Z");

    expect(formatStampDateTime(stampedAt, "Asia/Seoul")).toContain("오전 9:07");
    expect(formatStampDateTime(stampedAt, "Australia/Sydney")).toContain("오전 11:07");
    expect(formatStampTime(stampedAt, "Asia/Seoul")).toBe("오전 9:07");
    expect(formatStampTime(stampedAt, "Australia/Sydney")).toBe("오전 11:07");
  });
});
