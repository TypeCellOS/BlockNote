import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    // Format + fast lint (no type-aware) on pre-commit for speed.
    // Full type-aware check runs in CI via `vp check`.
    "*": "vp check --fix",
  },
  run: {
    // Cache package.json scripts by default (off by default in vp).
    // Vite Task automatically fingerprints each command's read file set,
    // so cache invalidation already follows the workspace dependency graph:
    // when `core`'s dist changes, `react`'s build cache misses because
    // its tsc step reads `core`'s `.d.ts` files.
    cache: { scripts: true },
  },
  // Workspace-level project list for tooling that discovers tests across the
  // monorepo (e.g. the Vitest VSCode extension). Replaces the old
  // `vitest.workspace.ts` — Vitest 4 dropped `defineWorkspace` in favour of
  // declaring projects here. Each entry points at the package's
  // `vite.config.ts`, which carries that package's own `test` block.
  test: {
    projects: [
      "./packages/ariakit/vite.config.ts",
      "./packages/code-block/vite.config.ts",
      "./packages/core/vite.config.ts",
      "./packages/mantine/vite.config.ts",
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
      "./tests/vite.config.ts",
      "./tests/vite.config.browser.ts",
    ],
  },
  lint: {
    plugins: ["typescript", "react", "import"],
    // Adds pre-migration ESLint rules with no oxlint equivalents.
    jsPlugins: [{ name: "import-eslint", specifier: "eslint-plugin-import" }],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
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
      // - docs/ needs Next.js type generation (next-env.d.ts) to typecheck
      // - examples/, playground/, tests/ have 91+ separate tsconfigs that
      //   each spin up a tsgolint instance, adding ~20s to the type-aware pass.
      //   These are consumer/demo code — library packages are what matter.
      "docs/**",
      "examples/**",
      "playground/**",
      "tests/**",
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
