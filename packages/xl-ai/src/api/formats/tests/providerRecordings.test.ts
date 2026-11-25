import * as glob from "glob";
import path from "path";
import { describe, expect, it } from "vite-plus/test";

describe("AI provider recordings", () => {
  it("has 87 distinct first-request recordings at valid paths", () => {
    const files = glob.sync(
      path.join(__dirname, "../**/__msw_snapshots__/**/*.json"),
    );
    const seen = new Map<string, string>();

    for (const file of files) {
      const match = /^(.*)_1_[a-f0-9]{32}\.json$/.exec(file);
      if (!match) {
        throw new Error(`Invalid AI provider recording filename: ${file}`);
      }
      const [, key] = match;
      const prior = seen.get(key);
      if (prior !== undefined) {
        throw new Error(`Duplicate AI provider recordings: ${prior}, ${file}`);
      }
      seen.set(key, file);
    }

    expect(seen.size).toBe(87);
  });
});
