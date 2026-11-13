import { describe, expect, it } from "vitest";

import { formatStampDateTime } from "./stamp-photo";

describe("stamp photo", () => {
  it("formats the certification date and time in Korean local time", () => {
    const formatted = formatStampDateTime(new Date(2026, 10, 13, 18, 7));

    expect(formatted).toContain("2026");
    expect(formatted).toContain("11");
    expect(formatted).toContain("13");
    expect(formatted).toContain("18:07");
  });
});