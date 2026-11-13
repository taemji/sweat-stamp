export interface CalendarDay {
  dateKey: string | null;
  dayNumber: number | null;
}

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getMonthCalendarDays(month: Date): CalendarDay[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  return Array.from({ length: 42 }, (_, index) => {
    const dayNumber = index - firstWeekday + 1;

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