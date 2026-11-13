import { describe, expect, it } from "vitest";

import {
  WEEKDAY_LABELS,
  formatDayLabel,
  getLocalDateKey,
  getMonthCalendarDays,
  getWeekDateKeys,
  shiftMonth,
} from "./certification-calendar";

describe("certification calendar", () => {
  it("builds a Monday-first month grid with only the weeks it needs", () => {
    const november = getMonthCalendarDays(new Date(2026, 10, 1));

    expect(november).toHaveLength(42);
    expect(november[5]).toEqual({ dateKey: null, dayNumber: null });
    expect(november[6]).toEqual({ dateKey: "2026-11-01", dayNumber: 1 });
    expect(november[35]).toEqual({ dateKey: "2026-11-30", dayNumber: 30 });

    const february = getMonthCalendarDays(new Date(2027, 1, 1));

    expect(february).toHaveLength(28);
    expect(february[0]).toEqual({ dateKey: "2027-02-01", dayNumber: 1 });
    expect(february[27]).toEqual({ dateKey: "2027-02-28", dayNumber: 28 });

    expect(getMonthCalendarDays(new Date(2026, 9, 1))).toHaveLength(35);
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

  it("lists the Monday-to-Sunday week around a date, across month ends", () => {
    expect(getWeekDateKeys("2026-11-14")).toEqual([
      "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15",
    ]);
    expect(getWeekDateKeys("2026-11-29")[0]).toBe("2026-11-23");
    expect(getWeekDateKeys("2026-12-02")).toEqual([
      "2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05", "2026-12-06",
    ]);
  });

  it("labels weekdays in the same Monday-first order as the grids", () => {
    const week = getWeekDateKeys("2026-11-14");

    expect(WEEKDAY_LABELS).toEqual(["월", "화", "수", "목", "금", "토", "일"]);
    expect(new Date(`${week[0]}T00:00:00`).getDay()).toBe(1);
    expect(new Date(`${week[6]}T00:00:00`).getDay()).toBe(0);
  });

  it("reads today's date in a member's time zone", () => {
    const lateEveningInSeoul = new Date("2026-11-14T14:30:00Z");

    expect(getLocalDateKey(lateEveningInSeoul, "Asia/Seoul")).toBe("2026-11-14");
    expect(getLocalDateKey(lateEveningInSeoul, "Australia/Sydney")).toBe("2026-11-15");
  });

  it("labels the day in a member's time zone", () => {
    const lateEveningInSeoul = new Date("2026-11-14T14:30:00Z");

    expect(formatDayLabel(lateEveningInSeoul, "Asia/Seoul")).toBe("SAT · NOV 14");
    expect(formatDayLabel(lateEveningInSeoul, "Australia/Sydney")).toBe("SUN · NOV 15");
  });
});
