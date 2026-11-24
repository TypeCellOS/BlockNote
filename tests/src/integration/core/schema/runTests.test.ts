import { describe, expect } from "vite-plus/test";
import type {} from "../../../../vitestSetup.node-fixtures.js";

import { useFileTestEditor } from "../testEditorOptions.js";

const it = useFileTestEditor();

function snapshotSpecs(
  specs: Record<string, { implementation?: object }>,
  field: "node" | "mark",
) {
  return Object.fromEntries(
    Object.entries(specs).map(([key, spec]) => {
      const { implementation } = spec;
      if (!implementation) {
        return [key, spec];
      }
      const extension =
        field === "node"
          ? "node" in implementation && implementation.node
          : "mark" in implementation && implementation.mark;
      return [
        key,
        typeof extension === "object"
          ? { ...spec, implementation: { ...implementation, [field]: null } }
          : spec,
      ];
    }),
  );
}

// Tests for verifying that exporting blocks to other formats works as expected.
// Used for as many cases as possible to ensure each block or set of blocks is
// correctly converted into different formats.
describe("Schema test", () => {
  it("Block specs test", async ({ editor }) => {
    const specs = snapshotSpecs(editor.schema.blockSpecs, "node");
    await expect(specs).toMatchFileSnapshot(`./__snapshots__/blocks.json`);
  });

  it("Inline content specs test", async ({ editor }) => {
    const specs = snapshotSpecs(editor.schema.inlineContentSpecs, "node");
    await expect(specs).toMatchFileSnapshot(
      `./__snapshots__/inlinecontent.json`,
    );
  });

  it("Style specs test", async ({ editor }) => {
    await expect(
      snapshotSpecs(editor.schema.styleSpecs, "mark"),
    ).toMatchFileSnapshot(`./__snapshots__/styles.json`);
  });
});
