import { describe, expect } from "vite-plus/test";

import { parseJSON } from "./parseJSON.js";

/**
 * A table of two rows: the first cell has the props, and the other cells
 * fit a first cell with a row span of 2.
 */
function table(props: Record<string, unknown>) {
  return {
    type: "table",
    content: {
      type: "tableContent",
      rows: [
        {
          cells: [
            { type: "tableCell", props, content: "a" },
            { type: "tableCell", content: "b" },
          ],
        },
        { cells: [{ type: "tableCell", content: "c" }] },
      ],
    },
  } as never;
}

// One editor for the read-only cases of this file.
const it = globalThis.it.extend(
  "editor",
  { scope: "file" },
  // eslint-disable-next-line no-empty-pattern -- Vitest requires destructured fixture dependencies.
  async ({}, { onCleanup }) => {
    const { createSetupEditor } =
      await import("../../../../../../tests/src/commands/node/setupEditor.js");
    const { editor } = await createSetupEditor(onCleanup)({
      initialContent: [{ id: "p", type: "paragraph" }],
    });
    return editor;
  },
);

describe("parseJSON: the spans of table cells", () => {
  it("accepts the largest spans of the HTML table model", ({ editor }) => {
    expect(parseJSON(editor, [table({ colspan: 1000 })]).error).toBeUndefined();
    expect(parseJSON(editor, [table({ rowspan: 2 })]).error).toBeUndefined();
  });

  it("gives an error for a column span above 1,000", ({ editor }) => {
    expect(parseJSON(editor, [table({ colspan: 1001 })])).toEqual({
      error: "invalid-document",
    });
  });

  it("gives an error for a row span above 65,534", ({ editor }) => {
    expect(parseJSON(editor, [table({ rowspan: 65535 })])).toEqual({
      error: "invalid-document",
    });
  });

  it("gives an error for a table with a large span in a child block", ({
    editor,
  }) => {
    expect(
      parseJSON(editor, [
        {
          type: "paragraph",
          content: "parent",
          children: [table({ colspan: 1_000_000 })],
        },
      ]),
    ).toEqual({ error: "invalid-document" });
  });
});
