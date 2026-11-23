import * as path from "path";
import { configDefaults, defineConfig, type UserConfig } from "vite-plus";
import { buildCacheInputs } from "../scripts/build-cache-inputs.js";

// https://vitejs.dev/config/
export default defineConfig(
  (conf) =>
    ({
      run: {
        tasks: {
          build: {
            command: "tsc",
            cache: {
              input: [
                ...buildCacheInputs("tests"),
                { pattern: "!**/*.tsbuildinfo", base: "workspace" },
              ],
            },
          },
          test: {
            command: "vp test --run",
            cache: {
              // CI requires built-package coverage; NEXTJS_TEST_MODE enables
              // the Next.js integration suite and selects dev or build mode.
              env: ["CI", "NEXTJS_TEST_MODE"],
              input: [
                { auto: true },
                { pattern: "!**/.next/**", base: "workspace" },
                {
                  pattern: "!tests/nextjs-test-app/node_modules/**",
                  base: "workspace",
                },
              ],
            },
          },
        },
      },
      test: {
        exclude: [...configDefaults.exclude, "**/*.browser.test.*"],
        // Preserve Vitest 4 mock history during the toolchain upgrade.
        clearMocks: false,
        // Reuse the editor module graph within each worker.
        isolate: false,
        setupFiles: ["./vitestSetup.ts", "./vitestSetup.node-fixtures.ts"],
        include: ["./src/unit/**/*.test.?(c|m)[jt]s?(x)"],
      },
      resolve: {
        alias:
          conf.command === "build"
            ? ({
                "@shared": path.resolve(__dirname, "../shared/"),
              } as Record<string, string>)
            : ({
                "@shared": path.resolve(__dirname, "../shared/"),
                // load live from sources with live reload working
                "@blocknote/core": path.resolve(
                  __dirname,
                  "../packages/core/src/",
                ),
                "@blocknote/react": path.resolve(
                  __dirname,
                  "../packages/react/src/",
                ),
                "@blocknote/ariakit": path.resolve(
                  __dirname,
                  "../packages/ariakit/src/",
                ),
                "@blocknote/shadcn": path.resolve(
                  __dirname,
                  "../packages/shadcn/src/",
                ),
                "@blocknote/mantine": path.resolve(
                  __dirname,
                  "../packages/mantine/src/",
                ),
                "@blocknote/math-block": path.resolve(
                  __dirname,
                  "../packages/math-block/src/",
                ),
                "@blocknote/diagram-block": path.resolve(
                  __dirname,
                  "../packages/diagram-block/src/",
                ),
                "@blocknote/server-util": path.resolve(
                  __dirname,
                  "../packages/server-util/src/",
                ),
              } as Record<string, string>),
      },
    }) as UserConfig,
);
