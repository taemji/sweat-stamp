import { describe, expect, it } from "vitest";

import { createDailyRoutines, readDailyCustomIds, readDailyRoutines } from "./daily-routines";

describe("daily routines", () => {
  it("keeps routines saved today", () => {
    const stored = createDailyRoutines({ taem: "Barre" }, "2026-11-14");

    expect(readDailyRoutines(stored, "2026-11-14")).toEqual({ taem: "Barre" });
  });

  it("drops routines saved on another day", () => {
    const stored = createDailyRoutines({ taem: "숨쉬기" }, "2026-11-13");

    expect(readDailyRoutines(stored, "2026-11-14")).toEqual({});
  });

  it("drops legacy routines saved without a date", () => {
    expect(readDailyRoutines({ taem: "숨쉬기", sam: "필라테스" }, "2026-11-14")).toEqual({});
    expect(readDailyRoutines(null, "2026-11-14")).toEqual({});
  });

  it("ignores routine values that are not text or are blank", () => {
    const stored = { dateKey: "2026-11-14", routines: { taem: "Barre", sam: 3, sook: "", yoom: "  " } };

    expect(readDailyRoutines(stored, "2026-11-14")).toEqual({ taem: "Barre" });
  });

  it("remembers which members typed their own workout today", () => {
    const stored = createDailyRoutines({ taem: "Ballet", sam: "Pilates reformer" }, "2026-11-14", ["taem", "sook"]);

    expect(stored.custom).toEqual(["taem"]);
    expect(readDailyCustomIds(stored, "2026-11-14")).toEqual(["taem"]);
    expect(readDailyCustomIds(stored, "2026-11-15")).toEqual([]);
    expect(readDailyCustomIds({ dateKey: "2026-11-14", routines: { taem: "Ballet" } }, "2026-11-14")).toEqual([]);
  });
});
