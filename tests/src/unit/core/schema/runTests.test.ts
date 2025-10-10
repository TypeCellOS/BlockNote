import { describe, expect, it } from "vitest";

import { createTestEditor } from "../createTestEditor.js";
import { testSchema } from "../testSchema.js";

// Tests for verifying that exporting blocks to other formats works as expected.
// Used for as many cases as possible to ensure each block or set of blocks is
// correctly converted into different formats.
describe("Schema test", () => {
  const getEditor = createTestEditor(testSchema);

  it("Block specs test", async () => {
    await expect(getEditor().schema.blockSpecs).toMatchFileSnapshot(
      `./__snapshots__/blocks.json`,
    );
  });

  it("Inline content specs test", async () => {
    await expect(getEditor().schema.inlineContentSpecs).toMatchFileSnapshot(
      `./__snapshots__/inlinecontent.json`,
    );
  });

  it("Style specs test", async () => {
    await expect(getEditor().schema.styleSpecs).toMatchFileSnapshot(
      `./__snapshots__/styles.json`,
    );
  });
});
