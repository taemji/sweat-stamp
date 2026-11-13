import { describe, expect, it } from "vitest";

import { formatKoreanHeadcount, formatKoreanOrdinal } from "./korean-format";

describe("korean format", () => {
  it("formats headcounts with native Korean numbers", () => {
    expect(formatKoreanHeadcount(1)).toBe("한 명");
    expect(formatKoreanHeadcount(3)).toBe("세 명");
  });

  it("formats ordinals with 첫 for the first", () => {
    expect(formatKoreanOrdinal(1)).toBe("첫 번째");
    expect(formatKoreanOrdinal(4)).toBe("네 번째");
    expect(formatKoreanOrdinal(7)).toBe("일곱 번째");
  });

  it("falls back to digits past seven", () => {
    expect(formatKoreanHeadcount(8)).toBe("8 명");
    expect(formatKoreanOrdinal(8)).toBe("8 번째");
  });
});
