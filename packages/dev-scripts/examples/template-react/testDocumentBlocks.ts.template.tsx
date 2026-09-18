import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import type { Project } from "../util.js";

/**
 * Emits the shared example document (`shared/testDocumentBlocks.ts`) into the
 * example verbatim, so the example can `import { testDocumentBlocks }` for its
 * editor `initialContent` and still run standalone (no cross-directory imports).
 *
 * Only generated for examples with `"sharedTestDocument": true` in their
 * `.bnexample.json`.
 */
export function shouldGenerate(project: Project) {
  return project.config.sharedTestDocument === true;
}

// Emitted into `src/` (not the example root): the docs site copies only an
// example's `src/**` into its demo tree, so a root-level file would leave
// the App's import dangling there and break the docs build.
export const targetPath = "src/testDocumentBlocks.ts";

const template = () => {
  const sharedFile = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../../shared/testDocumentBlocks.ts",
  );
  const source = fs.readFileSync(sharedFile, "utf-8");
  return `// AUTO-GENERATED FILE, DO NOT EDIT DIRECTLY.
// Generated from shared/testDocumentBlocks.ts — run \`pnpm run gen\` to update.
${source}`;
};

export default template;
