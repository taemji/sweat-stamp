export interface CalendarDay {
  dateKey: string | null;
  dayNumber: number | null;
}

export const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"] as const;

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getMonthCalendarDays(month: Date): CalendarDay[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const leadingBlankDays = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cellCount = Math.ceil((leadingBlankDays + daysInMonth) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    const dayNumber = index - leadingBlankDays + 1;

    if (dayNumber < 1 || dayNumber > daysInMonth) {
      return { dateKey: null, dayNumber: null };
    }

    const monthNumber = String(monthIndex + 1).padStart(2, "0");
    const paddedDay = String(dayNumber).padStart(2, "0");

    return {
      dateKey: `${year}-${monthNumber}-${paddedDay}`,
      dayNumber,
    };
  });
}

export function shiftMonth(month: Date, offset: number) {
  return new Date(month.getFullYear(), month.getMonth() + offset, 1);
}

export function getWeekDateKeys(date = new Date()) {
  const daysSinceMonday = (date.getDay() + 6) % 7;

  return Array.from({ length: 7 }, (_, index) => (
    getLocalDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysSinceMonday + index))
  ));
}
