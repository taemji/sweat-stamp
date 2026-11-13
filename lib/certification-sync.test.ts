import { describe, expect, it, vi } from "vitest";

import { shouldUploadPending, withTimeout } from "./certification-sync";

describe("certification sync", () => {
  it("uploads a pending stamp the server does not have", () => {
    expect(shouldUploadPending({ completedAt: "2026-11-14T01:00:00Z" }, undefined)).toBe(true);
  });

  it("keeps whichever stamp was made first", () => {
    const earlier = { completedAt: "2026-11-14T01:00:00Z" };
    const later = { completedAt: "2026-11-14T02:00:00Z" };

    expect(shouldUploadPending(earlier, later)).toBe(true);
    expect(shouldUploadPending(later, earlier)).toBe(false);
    expect(shouldUploadPending(earlier, earlier)).toBe(false);
  });

  it("resolves before the deadline and rejects after it", async () => {
    vi.useFakeTimers();

    const fast = withTimeout(Promise.resolve("ok"), 1000);
    await expect(fast).resolves.toBe("ok");

    const slow = withTimeout(new Promise(() => undefined), 1000, "too slow");
    const assertion = expect(slow).rejects.toThrow("too slow");
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;

    vi.useRealTimers();
  });
});
