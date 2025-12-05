import { describe, expect, it } from "vitest";

import { createTestEditor } from "../createTestEditor.js";
import { testSchema } from "../testSchema.js";

// Tests for verifying that exporting blocks to other formats works as expected.
// Used for as many cases as possible to ensure each block or set of blocks is
// correctly converted into different formats.
describe("Schema test", () => {
  const getEditor = createTestEditor(testSchema);

  it("Block specs test", async () => {
    const specs = getEditor().schema.blockSpecs;
    Object.values(specs).forEach((spec) => {
      if (
        typeof spec.implementation === "object" &&
        spec.implementation !== null &&
        typeof spec.implementation.node === "object"
      ) {
        spec.implementation.node = null as any;
      }
    });
    await expect(specs).toMatchFileSnapshot(`./__snapshots__/blocks.json`);
  });

  it("Inline content specs test", async () => {
    const specs = getEditor().schema.inlineContentSpecs;
    Object.values(specs).forEach((spec) => {
      if (
        typeof spec.implementation === "object" &&
        spec.implementation !== null &&
        typeof spec.implementation.node === "object"
      ) {
        spec.implementation.node = null as any;
      }
    });
    await expect(specs).toMatchFileSnapshot(
      `./__snapshots__/inlinecontent.json`,
    );
  });

  it("Style specs test", async () => {
    const specs = getEditor().schema.styleSpecs;
    Object.values(specs).forEach((spec) => {
      if (
        typeof spec === "object" &&
        spec !== null &&
        typeof spec.implementation === "object" &&
        spec.implementation !== null &&
        typeof spec.implementation.mark === "object"
      ) {
        spec.implementation.mark = null as any;
      }
    });
    await expect(getEditor().schema.styleSpecs).toMatchFileSnapshot(
      `./__snapshots__/styles.json`,
    );
  });
});
