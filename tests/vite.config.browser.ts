import tailwindcss from "@tailwindcss/vite";
import * as fs from "fs";
import * as path from "path";
import { configDefaults, defineConfig, type UserConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser/providers/playwright";
import * as commands from "./src/commands/transport/index.js";

// For the desktop instances: end-to-end/mobile runs only in the "android"
// instance. An instance-level `exclude` replaces the resolved base exclude
// (including CLI exclusions), so apply the CI split at both levels.
const CI_EXCLUDE =
  process.env.BLOCKNOTE_E2E_GROUP === "non-pdf"
    ? [
        "**/typstPdfImages.test.tsx",
        "../packages/xl-pdf-exporter/src/pdfua/compileTypst.browser.test.ts",
      ]
    : [];
const DESKTOP_EXCLUDE = [
  ...configDefaults.exclude,
  ...CI_EXCLUDE,
  "**/end-to-end/mobile/**",
  "../packages/*/src/**/*.screen-reader.test.ts",
];

// 1280x720 matches the old Playwright defaults so visual baselines have room.
// Set both the Playwright context and the Vitest test iframe to the same size
// so the harness doesn't scale the editor to fit a different viewport.
const VIEWPORT = { width: 1280, height: 720 };
const PHONE_VIEWPORT = { width: 393, height: 727 };

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
    .filter(([name]) => name?.startsWith("@blocknote/"))
    // xl-typst-compiler resolves via its package exports instead: its `/pkg`
    // and `/wasm` subpaths point at wasm build outputs that live next to
    // (not under) src/, which the prefix-replace alias would misdirect.
    // docker-run.sh mounts its dist/types/pkg alongside src for this.
    .filter(([name]) => name !== "@blocknote/xl-typst-compiler"),
);

// Native Chromium is a quick feedback loop, not a replacement for the Docker
// matrix. Only admit files that don't read or write platform-specific artifacts
// and don't need mobile, native clipboard, or Docker's OS-level dependencies.
const LOCAL_BROWSER_FILES = [
  "src/end-to-end/linktoolbar/linkToolbar.test.tsx",
  "src/integration/formatConversion/exportParseEquality/fileLinks.browser.test.ts",
  "../packages/core/src/editor/managers/EventManager.browser.test.ts",
  "../packages/core/src/extensions/FormattingToolbar/FormattingToolbar.browser.test.ts",
  "../packages/react/src/components/FormattingToolbar/DefaultButtons/BasicTextStyleButton.browser.test.tsx",
  "../packages/react/src/components/FormattingToolbar/DefaultButtons/ColorStyleButton.browser.test.tsx",
  "../packages/react/src/components/FormattingToolbar/DefaultButtons/CreateLinkButton.browser.test.tsx",
  "../packages/react/src/components/FormattingToolbar/DefaultButtons/TextAlignButton.browser.test.tsx",
  "../packages/react/src/hooks/useSelectedBlocks.browser.test.tsx",
  "../packages/react/src/schema/ReactBlockSpec.browser.test.tsx",
  "../packages/react/src/components/Versioning/VersioningSidebar.browser.test.tsx",
];

function localBrowserTestOptions() {
  // Vitest treats --no-update as false, which overrides "none" and lets
  // missing snapshots be written outside CI.
  if (
    process.argv.some((arg) =>
      /^(?:-u|--(?:no-)?(?:update|u))(?:=|$)/.test(arg),
    )
  ) {
    throw new Error("Update browser snapshots in Docker, not browser-local.");
  }
  return {
    name: "browser-local",
    include: LOCAL_BROWSER_FILES,
    retry: 0,
    update: "none",
    reporters: ["default"],
  };
}

// `defineConfig` with the inline object form trips TS2321 (excessive stack depth)
// once the browser config is this large; the function form + `as UserConfig`
// avoids the deep inference.
export default defineConfig(
  ({ mode }) =>
    ({
      // tailwindcss() is required for the ShadCN tests: the shadcn example's
      // `tailwind.css` (and `@apply` directives in package sources) only work
      // when Tailwind v4 processes the CSS. Without it, ShadCN UI components
      // render unstyled because their utility classes don't exist.
      plugins: [tailwindcss()],
      // ODT exporters use namespaced JSX to emit XML.
      oxc: { jsx: { throwIfNamespace: false } },
      optimizeDeps: {
        // Vitest already scans the browser test and setup entry points, even
        // for filtered runs. Keep discovery enabled for transitive imports.
        // Prebundle React's entry points and the late TipTap import explicitly:
        // a reload after the editor mounts can split React across optimizer
        // generations in the same iframe.
        include: [
          "react",
          "react-dom",
          "react-dom/client",
          "react/jsx-runtime",
          "react/jsx-dev-runtime",
          "@tiptap/pm/transform",
        ],
      },
      resolve: {
        dedupe: ["react", "react-dom", "vitest-browser-react"],
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
        // Preserve Vitest 4 mock history during the toolchain upgrade.
        clearMocks: false,
        name: "e2e",
        // Besides end-to-end tests, this suite runs browser integration tests
        // and browser tests colocated with the code they cover. Native
        // screen-reader tests use their own runner. Node configs exclude
        // browser tests.
        include: [
          "./src/end-to-end/**/*.test.tsx",
          "./src/integration/**/*.browser.test.?(c|m)[jt]s?(x)",
          "../examples/*/*/src/**/*.browser.test.?(c|m)[jt]s?(x)",
          "../packages/*/src/**/*.browser.test.?(c|m)[jt]s?(x)",
        ],
        exclude: [
          ...configDefaults.exclude,
          ...CI_EXCLUDE,
          "../packages/*/src/**/*.screen-reader.test.ts",
        ],

        setupFiles: [
          "./vitestSetup.browser.ts",
          "./vitestSetup.browser-fixtures.ts",
        ],
        // Keep direct/filtered invocations serial. The full local Docker
        // runner enables desktop parallelism in controlled batches.
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
        // `@vitest/ui`, whose version must match Vite Plus's bundled Vitest.
        reporters: ["default", ["html", { outputDir: "./playwright-report" }]],
        ...(mode === "browser-local" && localBrowserTestOptions()),
        browser: {
          enabled: true,
          // Keep Vitest 4's partial, case-insensitive locator matching.
          locators: { exact: false },
          // Global default tolerance for every `toMatchScreenshot` assertion.
          // The three browsers run in one contended Docker container and minor
          // anti-aliasing / sub-pixel font-rendering differences (e.g. a 24px /
          // 0.01-ratio diff on a table screenshot) are not real regressions but
          // still fail an exact pixel comparison. Allow up to 2% of pixels to
          // differ — comfortably above the observed ~0.01 flake while a genuine
          // layout/content change moves far more than that. Per-test calls can
          // still tighten or loosen this via comparatorOptions.
          expect: {
            toMatchScreenshot: {
              comparatorName: "pixelmatch",
              comparatorOptions: {
                allowedMismatchedPixelRatio: 0.02,
              },
            },
          },
          provider: playwright({
            contextOptions: { viewport: VIEWPORT },
          }),
          viewport: VIEWPORT,
          headless: true,
          // On failure Vitest otherwise captures a page screenshot into
          // __screenshots__/<testfile>/<test name>-<n>.png — same dir as the
          // `toMatchScreenshot` baselines, but named after the test title, so
          // they masquerade as stray baselines and pollute git. The failures
          // still show in the HTML report (errors + stack traces don't depend
          // on these shots), so disable them. See `e2e:report` to view.
          screenshotFailures: false,
          commands,
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
              // end-to-end/mobile runs only in the "android" instance below.
              exclude: DESKTOP_EXCLUDE,
            },
            {
              browser: "firefox",
              exclude: DESKTOP_EXCLUDE,
            },
            {
              browser: "webkit",
              exclude: DESKTOP_EXCLUDE,
            },
            {
              // Android-emulated chromium: mobile-specific end-to-end tests.
              // The context makes `isTouchDevice()` genuinely true and puts
              // prosemirror-view on its Android code paths (it samples the
              // user agent at module load), so the mobile tests need no
              // platform stubs. See tests/src/end-to-end/mobile/.
              browser: "chromium",
              name: "android",
              viewport: PHONE_VIEWPORT,
              launchOptions: {
                args: [
                  "--no-sandbox",
                  "--disable-setuid-sandbox",
                  "--disable-dev-shm-usage",
                ],
              },
              provider: playwright({
                contextOptions: {
                  viewport: PHONE_VIEWPORT,
                  userAgent:
                    "Mozilla/5.0 (Linux; Android 12; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36",
                  isMobile: true,
                  hasTouch: true,
                },
              }),
              // One principle decides membership: a suite runs here when it can
              // go red for a mobile-conditional reason no other suite here
              // already pins. Tests whose driving idiom doesn't translate to
              // touch emulation (positional mouse drags) carry
              // `skipIf(onAndroid)` guards; product behavior is never
              // skipped. No blanket screenshot suites — android baselines
              // would double maintenance for viewport-independent artifacts;
              // mobile visuals get curated tests with their own baselines.
              // (form/ and copypaste/ were tried and dropped: no distinct
              // mobile-conditional failure mode — see #3031.)
              include: [
                // Mobile-specific product behavior: the toolbar/popover
                // lifecycle, IME delivery routes, touch link taps.
                "./src/end-to-end/mobile/**/*.test.tsx",
                // The browser facts Form.Root rests on (implicit submission,
                // composition), re-asserted under mobile emulation flags.
                "./src/end-to-end/platform/**/*.test.tsx",
                // Synthesized Enter through the keymap chain — the #3001
                // fix's primary consumer, exercised across every handler.
                "./src/end-to-end/keyboardhandlers/**/*.test.tsx",
                // Synthesized Enter through the suggestion menu's own key
                // handling — a distinct consumer from the keymap chain.
                "./src/end-to-end/emojipicker/**/*.test.tsx",
              ],
            },
            {
              // iOS-emulated: WebKit with an iPhone UA makes prosemirror-view
              // take its iOS input paths (Enter left to the browser, the
              // native split read back from the DOM with a 200ms fallback),
              // which the android instance cannot reach. That path broke
              // under #2912's node view mutation filter and shipped in 0.53;
              // androidEnter.test.tsx pins it here. Not emulated: iOS
              // Safari's tap-as-hover, the soft keyboard, focus and zoom
              // (release checklist). Playwright's WebKit leaves
              // `navigator.maxTouchPoints` at 0 for `hasTouch`; the setup
              // stubs it to 5, the one stub of this instance.
              browser: "webkit",
              name: "ios",
              viewport: PHONE_VIEWPORT,
              provider: playwright({
                contextOptions: {
                  viewport: PHONE_VIEWPORT,
                  userAgent:
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
                  isMobile: true,
                  hasTouch: true,
                },
              }),
              include: ["./src/end-to-end/mobile/**/*.test.tsx"],
            },
          ],
          ...(mode === "browser-local" && {
            instances: [{ browser: "chromium" }],
          }),
        },
      },
    }) as unknown as UserConfig,
);
