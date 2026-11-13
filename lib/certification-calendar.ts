export interface CalendarDay {
  dateKey: string | null;
  dayNumber: number | null;
}

export function getCertificationKey(memberId: string, dateKey: string) {
  return `${dateKey}:${memberId}`;
}

export function parseCertificationKey(key: string) {
  const [dateKey, memberId] = key.split(":");
  return { dateKey, memberId };
}

export function countCertificationsInMonth(keys: string[], memberId: string, month: Date) {
  const monthPrefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-`;

  return keys.filter((key) => {
    const parsed = parseCertificationKey(key);
    return parsed.memberId === memberId && parsed.dateKey.startsWith(monthPrefix);
  }).length;
}

export function getMonthStart(dateKey: string) {
  const [year, month] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

export const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"] as const;

export function getLocalDateKey(date = new Date(), timeZone?: string) {
  if (timeZone) {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatDayLabel(date: Date, timeZone?: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric" })
      .formatToParts(date)
      .map((part) => [part.type, part.value.toUpperCase()]),
  );

  return `${parts.weekday} · ${parts.month} ${parts.day}`;
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

export function getWeekDateKeys(todayKey: string) {
  const [year, month, day] = todayKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const daysSinceMonday = (date.getDay() + 6) % 7;

  return Array.from({ length: 7 }, (_, index) => (
    getLocalDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysSinceMonday + index))
  ));
}
