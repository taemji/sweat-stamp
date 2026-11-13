export interface DailyRoutines {
  dateKey: string;
  routines: Record<string, string>;
  // Members whose routine was typed into the custom field, even if it matches a preset name.
  custom?: string[];
}

export function createDailyRoutines(routines: Record<string, string>, dateKey: string, custom: Iterable<string> = []): DailyRoutines {
  return { dateKey, routines, custom: [...custom].filter((memberId) => memberId in routines) };
}

function readTodaysRecord(stored: unknown, todayKey: string) {
  if (!stored || typeof stored !== "object") {
    return null;
  }

  const record = stored as Partial<DailyRoutines>;

  if (record.dateKey !== todayKey || !record.routines || typeof record.routines !== "object") {
    return null;
  }

  return record as DailyRoutines;
}

export function readDailyRoutines(stored: unknown, todayKey: string): Record<string, string> {
  const record = readTodaysRecord(stored, todayKey);

  if (!record) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(record.routines).filter(([, routine]) => typeof routine === "string" && routine.trim() !== ""),
  );
}

export function readDailyCustomIds(stored: unknown, todayKey: string): string[] {
  const record = readTodaysRecord(stored, todayKey);
  const routines = readDailyRoutines(stored, todayKey);

  if (!record || !Array.isArray(record.custom)) {
    return [];
  }

  return record.custom.filter((memberId): memberId is string => typeof memberId === "string" && memberId in routines);
}
