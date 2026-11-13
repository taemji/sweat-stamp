import { describe, expect, it } from "vitest";

import {
  getLegacyPhotoKeys,
  migrateCertificationRecord,
  migrateMemberRecord,
  migrateSelectedMemberId,
} from "./member-id-migration";

describe("member id migration", () => {
  it("migrates selected member and routine record ids", () => {
    expect(migrateSelectedMemberId("saem")).toBe("sam");
    expect(migrateSelectedMemberId("ssuk")).toBe("sook");
    expect(migrateSelectedMemberId("yum")).toBe("yoom");
    expect(migrateMemberRecord({ saem: "필라테스", ssuk: "수영", yum: "러닝", taem: "웨이트" })).toEqual({
      sam: "필라테스",
      sook: "수영",
      yoom: "러닝",
      taem: "웨이트",
    });
  });

  it("migrates certification keys and embedded member ids", () => {
    expect(migrateCertificationRecord({
      "2026-11-13:saem": { memberId: "saem", routine: "필라테스" },
      "2026-11-13:ssuk": { memberId: "ssuk", routine: "수영" },
      "2026-11-13:yum": { memberId: "yum", routine: "러닝" },
    })).toEqual({
      "2026-11-13:sam": { memberId: "sam", routine: "필라테스" },
      "2026-11-13:sook": { memberId: "sook", routine: "수영" },
      "2026-11-13:yoom": { memberId: "yoom", routine: "러닝" },
    });
  });

  it("keeps current certification data when legacy and current ids both exist", () => {
    expect(migrateCertificationRecord({
      "2026-11-13:saem": { memberId: "saem", routine: "이전 운동" },
      "2026-11-13:sam": { memberId: "sam", routine: "현재 운동" },
    })).toEqual({
      "2026-11-13:sam": { memberId: "sam", routine: "현재 운동" },
    });
  });

  it("maps migrated certification keys back to legacy photo keys", () => {
    expect(getLegacyPhotoKeys(["2026-11-13:sam", "2026-11-13:sook", "2026-11-13:yoom", "2026-11-13:taem"])).toEqual([
      { legacyKey: "2026-11-13:saem", nextKey: "2026-11-13:sam" },
      { legacyKey: "2026-11-13:ssuk", nextKey: "2026-11-13:sook" },
      { legacyKey: "2026-11-13:yum", nextKey: "2026-11-13:yoom" },
    ]);
  });
});