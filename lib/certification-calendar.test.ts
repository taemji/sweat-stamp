import { describe, expect, it } from "vitest";

import { getLocalDateKey, getMonthCalendarDays, shiftMonth } from "./certification-calendar";

describe("certification calendar", () => {
  it("builds a stable six-week month grid", () => {
    const days = getMonthCalendarDays(new Date(2026, 10, 1));

    expect(days).toHaveLength(42);
    expect(days[0]).toEqual({ dateKey: "2026-11-01", dayNumber: 1 });
    expect(days[29]).toEqual({ dateKey: "2026-11-30", dayNumber: 30 });
    expect(days[30]).toEqual({ dateKey: null, dayNumber: null });
  });

  it("keeps leap days and local date formatting", () => {
    const days = getMonthCalendarDays(new Date(2028, 1, 1));

    expect(days.some((day) => day.dateKey === "2028-02-29")).toBe(true);
    expect(getLocalDateKey(new Date(2028, 1, 29))).toBe("2028-02-29");
  });

  it("moves across year boundaries", () => {
    const previousMonth = shiftMonth(new Date(2026, 0, 1), -1);
    const nextMonth = shiftMonth(new Date(2026, 11, 1), 1);

    expect([previousMonth.getFullYear(), previousMonth.getMonth()]).toEqual([2025, 11]);
    expect([nextMonth.getFullYear(), nextMonth.getMonth()]).toEqual([2027, 0]);
  });
});