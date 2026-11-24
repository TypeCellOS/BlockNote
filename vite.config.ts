import { defineConfig } from "vite-plus";

// Opt existing suites into the new conventions as they are migrated, rather
// than requiring unrelated legacy tests to change in this PR.
const componentTestFiles = [
  "packages/core/src/blocks/Heading/Heading.browser.test.tsx",
  "packages/react/src/components/FormattingToolbar/FormattingToolbar.browser.test.tsx",
  "packages/react/src/components/FormattingToolbar/DesktopFormattingToolbarController.browser.test.tsx",
  "packages/react/src/components/FormattingToolbar/DefaultButtons/BasicTextStyleButton.browser.test.tsx",
  "packages/react/src/components/FormattingToolbar/DefaultButtons/ColorStyleButton.browser.test.tsx",
  "packages/react/src/components/FormattingToolbar/DefaultButtons/CreateLinkButton.browser.test.tsx",
  "packages/react/src/components/FormattingToolbar/DefaultButtons/NestBlockButtons.browser.test.tsx",
  "packages/react/src/components/FormattingToolbar/DefaultButtons/TextAlignButton.browser.test.tsx",
  "packages/react/src/components/FormattingToolbar/DefaultSelects/BlockTypeSelect.browser.test.tsx",
];
const testIdRestriction = {
  property: "getByTestId",
  message:
    "Use accessible locators such as getByRole with a name or getByLabel in browser tests.",
};
const testSleepMessage =
  "Wait for an observable condition (for example expect.element or expect.poll), not elapsed time. If testing timer behavior itself, document a targeted lint exception.";
const testSleepProperties = [
  { property: "waitForTimeout", message: testSleepMessage },
  { property: "setTimeout", message: testSleepMessage },
  { property: "sleep", message: testSleepMessage },
];
const browserTestImportPatterns = [
  {
    group: [
      "**/utils/accessibility",
      "**/utils/accessibility.*",
      "**/utils/keyboard",
      "**/utils/keyboard.*",
      "**/screen-reader/screenReader",
      "**/screen-reader/screenReader.*",
    ],
    allowTypeImports: true,
    message:
      "Use the registered commands from tests/src/utils/context.ts instead of importing command implementations.",
  },
  {
    group: ["timers", "timers/*", "node:timers", "node:timers/*"],
    message: testSleepMessage,
  },
];

export default defineConfig({
  staged: {
    // Format + fast lint (no type-aware) on pre-commit for speed.
    // Full type-aware check runs in CI via `vp run lint`.
    // Include the audit host even for CSS-only staged changes.
    "*": "vp check --fix vite.config.ts",
  },
  run: {
    // Cache package.json scripts by default (off by default in vp).
    // Vite Task automatically fingerprints each command's read file set,
    // so cache invalidation already follows the workspace dependency graph:
    // when `core`'s dist changes, `react`'s build cache misses because
    // its tsc step reads `core`'s `.d.ts` files.
    cache: { scripts: true },
    tasks: {
      // Docker owns image reuse. Always ask the daemon and execute browser runs:
      // image state, installed browsers, and reports aren't task-cache inputs.
      "e2e:image": {
        command: "bash tests/docker-build.sh",
        cache: false,
      },
      e2e: {
        command:
          "BLOCKNOTE_E2E_FULL=1 bash tests/docker-run.sh -e CI=1 -- --run",
        cache: false,
      },
      "e2e:local": {
        command: "vp test -c vite.config.browser.ts --mode browser-local --run",
        cwd: "tests",
        cache: false,
      },
      "e2e:updateSnaps": {
        command: "bash tests/docker-run.sh -e CI=1 -- --run --update=true",
        cache: false,
      },
      "e2e:report": {
        command: "serve -l 4173 tests/playwright-report",
        cache: false,
      },
      "test:screen-reader": {
        command: "node tests/src/screen-reader/run-screen-reader.mjs",
        cache: false,
      },
      "copy-package-readmes": {
        command: "node scripts/copy-package-readmes.mjs",
        // These copies are outputs, not inputs: automatic tracking of the
        // destination checks would make a fresh checkout miss every time.
        cache: {
          input: ["README.md", "scripts/copy-package-readmes.mjs"],
          output: ["packages/core/README.md", "packages/react/README.md"],
        },
      },
      // The release script is interactive and produces only side-effects
      // (git commit/tag/push, npm publish). It reads a stable file set
      // (package.json files), so vp would fingerprint it as unchanged and
      // replay stale cached stdout instead of running it. Always run fresh.
      deploy: {
        command: "node scripts/release.mjs",
        cache: false,
      },
    },
  },
  // Workspace-level project list for tooling that discovers tests across the
  // monorepo (e.g. the Vitest VSCode extension). Replaces the old
  // `vitest.workspace.ts` — Vitest 4 dropped `defineWorkspace` in favour of
  // declaring projects here. Each entry points at the package's
  // `vite.config.ts`, which carries that package's own `test` block.
  test: {
    // Preserve Vitest 4 mock history during the toolchain upgrade.
    clearMocks: false,
    projects: [
      "./packages/ariakit/vite.config.ts",
      "./packages/code-block/vite.config.ts",
      "./packages/core/vite.config.ts",
      "./packages/diagram-block/vite.config.ts",
      "./packages/mantine/vite.config.ts",
      "./packages/math-block/vite.config.ts",
      "./packages/react/vite.config.ts",
      "./packages/server-util/vite.config.ts",
      "./packages/shadcn/vite.config.ts",
      "./packages/xl-ai/vite.config.ts",
      "./packages/xl-ai-server/vite.config.ts",
      "./packages/xl-docx-exporter/vite.config.ts",
      "./packages/xl-email-exporter/vite.config.ts",
      "./packages/xl-multi-column/vite.config.ts",
      "./packages/xl-odt-exporter/vite.config.ts",
      "./packages/xl-pdf-exporter/vite.config.ts",
      "./packages/xl-typst-compiler/vite.config.ts",
      "./packages/xl-typst-exporter/vite.config.ts",
      "./tests/vite.config.ts",
      "./tests/vite.config.browser.ts",
    ],
  },
  lint: {
    plugins: ["typescript", "react", "import"],
    // ESLint compatibility rules and BlockNote-specific conventions.
    jsPlugins: [
      { name: "import-eslint", specifier: "eslint-plugin-import" },
      {
        name: "blocknote-tests",
        specifier: "./scripts/lint/component-browser-tests.mjs",
      },
      { name: "blocknote", specifier: "./scripts/css-variable-plugin.mjs" },
      // The rules of the text lens (packages/xl-ai/src/api/v2). FOLLOW-UP
      // (later): use them outside the lens too.
      { name: "lens", specifier: "./packages/xl-ai/lint/lensPlugin.js" },
      // The order of the declarations in a file (the text lens).
      { name: "perfectionist", specifier: "eslint-plugin-perfectionist" },
    ],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      "blocknote/css-variable-layering": "error",
      "no-console": "error",
      curly: "warn",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "import-eslint/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: true,
          peerDependencies: true,
          optionalDependencies: false,
          bundledDependencies: false,
        },
      ],
      "import-eslint/extensions": ["error", "always", { ignorePackages: true }],
      // Native oxlint dependency cycle rule to replace previous ESLint rule.
      // Disabled for now: there is a large set of known, pre-existing
      // dependency cycles in core (hubbed around BlockNoteEditor/schema/api).
      // Leaving this enabled (even at "warn") dumps a large volume of output
      // that adds noise and can crash the git pre-commit hook while printing to
      // stdout ("Resource temporarily unavailable"). All other (error-level)
      // lint rules still run on staging via `vp check`.
      // TODO: Refactor to break the cycles, then re-enable as an error.
      "import/no-cycle": "off",
    },
    overrides: [
      {
        // Pilot on the component examples
        files: componentTestFiles,
        rules: {
          "blocknote-tests/component-browser-structure": "error",
        },
      },
      {
        files: ["packages/*/src/**/*.{ts,tsx}"],
        excludeFiles: ["**/*.test.{ts,tsx}"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              patterns: [
                {
                  group: ["**/*.test", "**/*.test.*"],
                  message: "Production code must not import test files.",
                },
              ],
            },
          ],
        },
      },
      {
        // The text lens: each module imports only modules before it (see its
        // README), and the size of a function has limits. A function above a
        // limit has a disable comment with the reason.
        files: ["packages/xl-ai/src/api/v2/**/*.ts"],
        rules: {
          "import/no-cycle": "error",
          // A file imports a file of a different folder only through the
          // index.ts of that folder. A file in a folder above is not in a
          // different folder ("!../../*": `model.ts` from `util/blocks/`).
          // The patterns are gitignore patterns: oxlint ignores a `regex`
          // with a lookahead, without an error.
          "no-restricted-imports": [
            "error",
            {
              patterns: [
                {
                  group: ["./*/**", "../**/*/*", "!**/index.js", "!../../*"],
                  message:
                    "Import the index.js of the folder. It has the API of the folder for the other folders.",
                },
                {
                  group: ["**/*.test", "**/*.test.*"],
                  message: "Production code must not import test files.",
                },
              ],
            },
          ],
          // An export of a file is in the index.ts of its folder (the API of
          // the folder), or it has @internal in its doc comment, never both.
          // Thus, a reader of a file sees the API of the folder. oxlint has
          // no rule for it (no `no-unused-modules`; the version of
          // eslint-plugin-import fails in oxlint), and knip does not know
          // folders: it finds only the exports that no other file uses (see
          // the README, "Rules of the code").
          "lens/folder-api": "error",
          // The order of the declarations in a file: first the exports, then
          // the declarations without an export. In a group, the order stays
          // (`unsorted`): a caller before the functions that it calls. The
          // rule does not move variables (`const`, `let`): a variable starts
          // a new part of the file, and the rule sorts each part.
          "perfectionist/sort-modules": [
            "error",
            {
              type: "unsorted",
              customGroups: [{ groupName: "exported", modifiers: ["export"] }],
              groups: ["exported", "unknown"],
            },
          ],
          // Among the exports: the API of the folder (the names in its
          // index.ts) before the @internal exports. sort-modules cannot
          // see the difference: the two are `export` in the syntax tree.
          "lens/api-before-internal": "error",
          complexity: ["error", 15],
          "max-depth": ["error", 4],
          "max-lines-per-function": [
            "error",
            { max: 80, skipBlankLines: true, skipComments: true },
          ],
        },
      },
      {
        files: [
          "packages/xl-ai/src/api/v2/**/*.test.ts",
          "packages/xl-ai/src/api/v2/benchmarks/**",
          "packages/xl-ai/src/api/v2/testUtil/**",
        ],
        // Tests can use the exports of each file.
        rules: {
          "no-restricted-imports": "off",
          "lens/folder-api": "off",
          "perfectionist/sort-modules": "off",
          "lens/api-before-internal": "off",
          complexity: "off",
          "max-depth": "off",
          "max-lines-per-function": "off",
        },
      },
      {
        files: [
          "**/*.browser.test.{ts,tsx}",
          "**/*.screen-reader.test.{ts,tsx}",
        ],
        plugins: ["vitest"],
        rules: {
          // The plugin enables these defaults, which do not fit our test conventions.
          // Assertions can live in shared helpers outside a test callback.
          "vitest/expect-expect": "off",
          "vitest/no-standalone-expect": "off",
          // Browser-specific coverage and documented known failures are intentional.
          "vitest/no-conditional-expect": "off",
          "vitest/no-conditional-tests": "off",
          "vitest/no-disabled-tests": "off",
          // Existing mocks do not all provide explicit type parameters.
          "vitest/require-mock-type-parameters": "off",
          "vitest/no-focused-tests": "error",
          "vitest/valid-expect": ["error", { maxArgs: 2 }],
          "vitest/require-awaited-expect-poll": "error",
          "typescript/no-floating-promises": [
            "error",
            { ignoreVoid: false, checkThenables: true },
          ],
          "no-restricted-imports": [
            "error",
            {
              patterns: browserTestImportPatterns,
            },
          ],
          "no-restricted-properties": [
            "error",
            testIdRestriction,
            {
              property: "waitForTimeout",
              message:
                "Wait for observable readiness with expect.element or expect.poll instead of sleeping.",
            },
            {
              property: "sleep",
              message:
                "Wait for observable readiness with expect.element or expect.poll instead of sleeping.",
            },
          ],
        },
      },
      {
        files: componentTestFiles,
        rules: {
          "no-restricted-globals": [
            "error",
            { name: "setTimeout", message: testSleepMessage },
          ],
          "no-restricted-properties": [
            "error",
            ...testSleepProperties,
            testIdRestriction,
          ],
          "no-restricted-imports": [
            "error",
            {
              // Overrides replace rule options, so retain the shared safeguards.
              patterns: [
                ...browserTestImportPatterns,
                {
                  group: ["**/utils/editor.js", "**/utils/editor"],
                  importNames: ["sleep"],
                  message: testSleepMessage,
                },
              ],
            },
          ],
        },
      },
      {
        files: [
          "**/scripts/**",
          "**/*.mjs",
          "docs/lib/**",
          "docs/app/api/**",
          "packages/dev-scripts/**",
          "packages/xl-ai-server/**",
        ],
        rules: {
          "no-console": "off",
        },
      },
    ],
    ignorePatterns: [
      "**/dist/**",
      "**/types/**",
      "**/.next/**",
      "**/build/**",
      "**/coverage/**",
      "**/__snapshots__/**",
      "**/snapshots/**",
      "**/node_modules/**",
      "**/ui/**",
      "**/.source/**",
      // Non-library directories: skip all linting here.
      // - docs/ and tests/nextjs-test-app/ need Next.js type generation
      //   (next-env.d.ts / .next) before they can be type-checked.
      // - examples/ has 91 separate tsconfigs that each spin up a tsgolint
      //   instance, adding ~20s to the type-aware pass; it's demo code.
      "docs/**",
      "examples/**",
      "playground/**",
      "tests/nextjs-test-app/**",
      "fumadocs/**",
    ],
  },
  fmt: {
    semi: true,
    singleQuote: false,
    tabWidth: 2,
    printWidth: 80,
    trailingComma: "all",
    bracketSpacing: true,
    arrowParens: "always",
    endOfLine: "lf",
    sortTailwindcss: {},
    sortPackageJson: false,
    ignorePatterns: [
      "**/dist/**",
      "**/types/**",
      "**/.next/**",
      "**/build/**",
      "**/coverage/**",
      "**/__snapshots__/**",
      "**/snapshots/**",
      "**/*-snapshots/**",
      "**/node_modules/**",
      "**/.source/**",
      "**/test-results/**",
      "**/playwright-report/**",
      "**/blob-report/**",
      "**/*.mdx",
      "pnpm-lock.yaml",
    ],
  },
});
