import { defineConfig } from "vite-plus";
import { declarationBuildTask } from "../../scripts/build-cache-inputs.js";

export default defineConfig({
  run: {
    tasks: {
      build: declarationBuildTask("packages/dev-scripts"),
      "gen:examples": {
        command: "tsx examples/gen.ts",
        cache: {
          input: [
            { pattern: "pnpm-workspace.yaml", base: "workspace" },
            { pattern: "pnpm-lock.yaml", base: "workspace" },
            { pattern: "vite.config.ts", base: "workspace" },
            { pattern: "examples/*/*/.bnexample.json", base: "workspace" },
            { pattern: "examples/*/*/README.md", base: "workspace" },
            { pattern: "packages/dev-scripts/examples/**", base: "workspace" },
            // The testDocumentBlocks template copies this file verbatim into
            // the examples - edits to it must re-run generation.
            {
              pattern: "tests/src/fixtures/exporters/testDocumentBlocks.ts",
              base: "workspace",
            },
          ],
          output: [
            { pattern: "examples/*/*/package.json", base: "workspace" },
            { pattern: "examples/*/*/tsconfig.json", base: "workspace" },
            { pattern: "examples/*/*/vite.config.ts", base: "workspace" },
            { pattern: "examples/*/*/index.html", base: "workspace" },
            { pattern: "examples/*/*/main.tsx", base: "workspace" },
            { pattern: "examples/*/*/tailwind.css", base: "workspace" },
            {
              pattern: "examples/*/*/src/testDocumentBlocks.ts",
              base: "workspace",
            },
            { pattern: "playground/src/examples.gen.tsx", base: "workspace" },
          ],
        },
      },
      "gen:docs": {
        command: "tsx examples/genDocs.ts",
        // Replaying files cannot prune removed routes or merge dependencies
        // into the current (also hand-edited) docs/package.json.
        cache: false,
      },
    },
  },
});
