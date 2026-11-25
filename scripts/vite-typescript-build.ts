import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { Plugin } from "vite-plus";

export function typescriptBuild(
  mode: "declarations" | "typecheck" = "declarations",
): Plugin {
  let root: string;
  return {
    name: "blocknote-typescript-build",
    apply: "build",
    configResolved(config) {
      root = config.root;
    },
    buildStart: {
      order: "pre",
      handler() {
        // Use the project's native TypeScript CLI directly, keeping tsconfig
        // project references and the declaration layout used by package exports.
        const require = createRequire(join(root, "package.json"));
        const compiler = join(
          dirname(require.resolve("typescript/package.json")),
          "bin",
          "tsc",
        );
        if (mode === "declarations") {
          // TypeScript does not remove declarations for deleted source files.
          // Don't carry those leftovers into the next build's cache archive.
          rmSync(join(root, "types"), { recursive: true, force: true });
        }
        execFileSync(
          process.execPath,
          [
            compiler,
            "--project",
            "tsconfig.json",
            "--composite",
            "false",
            "--incremental",
            "false",
            ...(mode === "declarations"
              ? ["--rootDir", ".", "--noEmitOnError"]
              : ["--noEmit"]),
          ],
          { cwd: root, stdio: "inherit" },
        );
      },
    },
  };
}
