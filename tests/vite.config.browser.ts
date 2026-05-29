import * as fs from "fs";
import * as path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type UserConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser/providers/playwright";
import { positionalMouse } from "./src/utils/positionalMouse.js";

// 1280x720 matches the old Playwright defaults so visual baselines have room.
// Used as the playwright context viewport for every browser instance.
const VIEWPORT = { width: 1280, height: 720 };

// Resolve every `@blocknote/*` workspace package to its `src/` (like the unit
// `vite.config.ts` does for core/react). The e2e Docker image installs deps but
// no longer builds the packages to dist — the example apps the tests mount, and
// the packages they pull in, are transpiled from source by vite at test time.
// This is why editing packages/*/src needs no image rebuild: the source is
// bind-mounted into the (build-less) image at run time.
//
// A single bare-package alias also covers the bundled subpath entries the
// examples import (`@blocknote/core/style.css`, `@blocknote/core/fonts/inter.css`,
// …) because @rollup/plugin-alias does a prefix replace on a `/` boundary, and
// every package ships a matching `src/style.css` aggregator. The `xl-ai` /
// `xl-ai-server` pair is safe: the boundary stops `xl-ai` from matching
// `xl-ai-server`.
const packagesDir = path.resolve(__dirname, "../packages");
const blockNoteSrcAliases = Object.fromEntries(
  fs
    .readdirSync(packagesDir)
    .map((dir) => path.join(packagesDir, dir))
    .filter(
      (dir) =>
        fs.existsSync(path.join(dir, "src")) &&
        fs.existsSync(path.join(dir, "package.json")),
    )
    .map(
      (dir) =>
        [
          JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf-8"))
            .name as string,
          path.join(dir, "src"),
        ] as const,
    )
    .filter(([name]) => name?.startsWith("@blocknote/")),
);

// The e2e suite is designed to run in a fixed Linux environment (the Playwright
// Docker image) so behaviour is identical locally and on CI — see the migration
// notes. Locally you run it via the `test:e2e:ui` Docker script and view the
// Vitest UI from the host browser at http://localhost:63315/__vitest__/.

// `defineConfig` with the inline object form trips TS2321 (excessive stack depth)
// once the browser config is this large; the function form + `as UserConfig`
// avoids the deep inference.
export default defineConfig(
  () =>
    ({
      // tailwindcss() is required for the ShadCN tests: the shadcn example's
      // `tailwind.css` (and `@apply` directives in package sources) only work
      // when Tailwind v4 processes the CSS. Without it, ShadCN UI components
      // render unstyled because their utility classes don't exist.
      plugins: [tailwindcss()],
      resolve: {
        // Mount example apps via `@examples/<group>/<name>/src/App`. The examples
        // live outside the tests root, but vite-plus already allows serving the
        // workspace root, so only this runtime alias is needed. The matching
        // TypeScript side is the ambient `declare module "@examples/*"` in
        // src/examples.d.ts.
        alias: {
          ...blockNoteSrcAliases,
          "@examples": path.resolve(__dirname, "../examples"),
        },
      },
      test: {
        name: "e2e",
        include: ["./src/end-to-end/**/*.test.tsx"],
        setupFiles: ["./vitestSetup.browser.ts"],
        // Running three browsers concurrently inside one Docker container already
        // saturates CPU; layering per-browser file parallelism on top causes
        // 15s test timeouts and even Firefox WS-connect failures. One worker per
        // browser (browsers still run in parallel as separate vitest projects).
        fileParallelism: false,
        // 15s default is tight under contention — bumped so legitimately slow
        // screenshot tests don't fail on contention alone.
        testTimeout: 30000,
        // Retry up to 2 times before failing a test, since 3-browser-in-one-
        // container contention occasionally trips a webkit screenshot or
        // selector-wait. A genuinely broken test still fails consistently
        // across all 3 attempts.
        retry: 2,
        // Persist a navigable HTML report to tests/playwright-report/ (same
        // path the legacy Playwright HTML report used, so existing CI artifact
        // uploads keep working). The `html` reporter is provided by
        // `@vitest/ui` — its peer-dep version must match vite-plus-test's
        // expectation (4.1.5 at the time of writing); earlier 0.1.x doesn't
        // ship the `/reporter` subexport and errors at startup.
        reporters: ["default", "html"],
        outputFile: { html: "./playwright-report/index.html" },
        browser: {
          enabled: true,
          provider: playwright({
            contextOptions: { viewport: VIEWPORT },
          }),
          headless: true,
          commands: { positionalMouse },
          instances: [
            {
              browser: "chromium",
              // Chromium-only: required running as root inside the container.
              launchOptions: {
                args: [
                  "--no-sandbox",
                  "--disable-setuid-sandbox",
                  "--disable-dev-shm-usage",
                ],
              },
            },
            {
              browser: "firefox",
            },
            {
              browser: "webkit",
            },
          ],
        },
      },
    }) as UserConfig,
);
