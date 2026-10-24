import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vite-plus/test";

// These tests check the build output as an app installs it: in plain Node,
// without the aliases to the sources that the other tests use. They cannot find
// a missing dependency, as the workspace installs all of them (see nextjs/).
const packagesDir = resolve(__dirname, "../../../../packages");

function publishedPackages() {
  return readdirSync(packagesDir).flatMap((dir) => {
    const path = join(packagesDir, dir, "package.json");
    if (!existsSync(path)) {
      return [];
    }
    const pkg = JSON.parse(readFileSync(path, "utf8"));
    return pkg.private ? [] : [{ dir, pkg }];
  });
}

function exportTargets(exports: unknown): string[] {
  if (typeof exports === "string") {
    return [exports];
  }
  if (exports && typeof exports === "object") {
    return Object.values(exports).flatMap(exportTargets);
  }
  return [];
}

function runNode(script: string, env: Record<string, string> = {}) {
  return execFileSync(process.execPath, [join(__dirname, script)], {
    encoding: "utf8",
    env: { ...process.env, ...env },
    timeout: 120_000,
  });
}

// CI runs this after `vp run -r build`. Locally, it waits for a build.
describe.skipIf(!existsSync(join(packagesDir, "core/dist")) && !process.env.CI)(
  "Built packages",
  () => {
    it("point to files that exist", () => {
      const missing = publishedPackages().flatMap(({ dir, pkg }) =>
        [pkg.main, pkg.module, pkg.types, ...exportTargets(pkg.exports)]
          .filter((target): target is string => typeof target === "string")
          .filter((target) => !existsSync(resolve(packagesDir, dir, target)))
          .map((target) => `${pkg.name}: ${target}`),
      );
      expect([...new Set(missing)]).toEqual([]);
    });

    it("load in plain Node", { timeout: 60_000 }, () => {
      expect(JSON.parse(runNode("loadEntries.mjs"))).toEqual([]);
    });

    // React's development build crashed the process after the export (#3230).
    it.each(["development", "production"])(
      "export React and optional blocks on a server (NODE_ENV=%s)",
      { timeout: 60_000 },
      (nodeEnv) => {
        expect(runNode("serverExport.mjs", { NODE_ENV: nodeEnv })).toContain(
          "exported",
        );
      },
    );
  },
);
