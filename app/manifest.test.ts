import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import manifest from "./manifest";

describe("web app manifest", () => {
  it("lists PNG icons that exist, including a maskable icon", () => {
    const icons = manifest().icons ?? [];

    expect(icons.length).toBeGreaterThan(0);
    expect(icons.some((icon) => icon.purpose === "maskable")).toBe(true);

    for (const icon of icons) {
      expect(icon.type).toBe("image/png");
      expect(existsSync(path.join(process.cwd(), "public", icon.src)), icon.src).toBe(true);
    }
  });
});
