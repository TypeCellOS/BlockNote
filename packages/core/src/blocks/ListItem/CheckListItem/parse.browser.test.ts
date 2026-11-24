import { describe, expect } from "vite-plus/test";

// One editor for the read-only cases of this file.
const it = globalThis.it.extend(
  "editor",
  { scope: "file" },
  // eslint-disable-next-line no-empty-pattern -- Vitest requires destructured fixture dependencies.
  async ({}, { onCleanup }) => {
    const { createSetupEditor } =
      await import("../../../../../../tests/src/commands/node/setupEditor.js");
    const { editor } = await createSetupEditor(onCleanup)();
    return editor;
  },
);

describe("the HTML parse of a check list item", () => {
  it("reads a toggle list item with a check list child as a toggle", ({
    editor,
  }) => {
    const html = editor.blocksToHTMLLossy([
      {
        type: "toggleListItem",
        content: "Toggle",
        children: [
          { type: "checkListItem", props: { checked: true }, content: "Done" },
        ],
      },
    ]);
    expect(editor.tryParseHTMLToBlocks(html)).toMatchObject([
      {
        type: "toggleListItem",
        children: [{ type: "checkListItem", props: { checked: true } }],
      },
    ]);
  });
});
