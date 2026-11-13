export interface DailyRoutines {
  dateKey: string;
  routines: Record<string, string>;
}

export function createDailyRoutines(routines: Record<string, string>, dateKey: string): DailyRoutines {
  return { dateKey, routines };
}

export function readDailyRoutines(stored: unknown, todayKey: string): Record<string, string> {
  if (!stored || typeof stored !== "object") {
    return {};
  }

  const { dateKey, routines } = stored as Partial<DailyRoutines>;

  if (dateKey !== todayKey || !routines || typeof routines !== "object") {
    return {};
  }

  return Object.fromEntries(Object.entries(routines).filter(([, routine]) => typeof routine === "string"));
}
