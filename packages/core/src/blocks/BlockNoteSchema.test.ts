import { describe, expect } from "vite-plus/test";
import type {} from "../../../../tests/vitestSetup.node-fixtures.js";

import { useFileTestEditor } from "../../../../tests/src/integration/support/testEditorOptions.js";

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

describe("BlockNoteSchema", () => {
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
