import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Emits the shared example document (`shared/testDocumentBlocks.ts`) into the
 * example verbatim, so the example can `import { testDocumentBlocks }` for its
 * editor `initialContent` and still run standalone (no cross-directory imports).
 *
 * Only generated for examples with `"sharedTestDocument": true` in their
 * `.bnexample.json` (see gen.ts).
 */
const template = () => {
  const sharedFile = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../../shared/testDocumentBlocks.ts",
  );
  const source = fs.readFileSync(sharedFile, "utf-8");
  return `// AUTO-GENERATED FILE, DO NOT EDIT DIRECTLY.
// Generated from shared/testDocumentBlocks.ts — run \`npm run gen\` to update.
${source}`;
};

export default template;
