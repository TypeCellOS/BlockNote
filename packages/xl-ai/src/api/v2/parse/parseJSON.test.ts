import { describe, expect, it } from "vite-plus/test";

import type { LensBlock } from "../blocks/types.js";
import { createColumnsEditor, createEditor } from "../testUtil/fixtures.js";
import { parseJSON } from "./parseJSON.js";

describe("parseJSON", () => {
  it("gives the blocks in the form that the document stores them", () => {
    const editor = createEditor([{ id: "p", type: "paragraph" }]);
    const current = editor.document as LensBlock[];

    const result = parseJSON(
      editor,
      [{ id: "p", type: "paragraph", content: "Hello" }],
      current,
      current,
    );

    const blocks = result.error === undefined ? result.blocks : [];
    expect(blocks.map(({ id }) => id)).toEqual(["p"]);
    // A missing field gets its default value, as in the document.
    expect(blocks[0].props).toEqual(current[0].props);
  });

  it("gives an error for blocks that do not fit the schema", () => {
    const editor = createEditor([{ id: "p", type: "paragraph" }]);
    const current = editor.document as LensBlock[];

    expect(
      parseJSON(editor, [{ type: "unknown" } as never], current, current),
    ).toEqual({ error: "invalid-document" });
  });

  it("gives a later block with the ID of an earlier block the ID with a number", () => {
    const editor = createEditor([{ id: "p", type: "paragraph" }]);
    const current = editor.document as LensBlock[];

    const result = parseJSON(
      editor,
      [
        { id: "p", type: "paragraph", content: "One" },
        { id: "p", type: "paragraph", content: "Two" },
      ],
      current,
      current,
    );

    const ids =
      result.error === undefined ? result.blocks.map(({ id }) => id) : [];
    // As in the current document and in a base (see `withDistinctIds`).
    expect(ids).toEqual(["p", "p-2"]);
  });

  it("gives a new ID to a block that changes between a layout type and another type", () => {
    const editor = createColumnsEditor();
    const current = editor.document as LensBlock[];

    // The column c1 becomes a paragraph: it cannot change in place.
    const result = parseJSON(
      editor,
      [{ id: "c1", type: "paragraph", content: "Alpha" }],
      current,
      current,
    );

    const ids =
      result.error === undefined ? result.blocks.map(({ id }) => id) : [];
    expect(ids).toHaveLength(1);
    expect(ids[0]).not.toBe("c1");
  });

  it("fits the layout blocks before the conversion", () => {
    const editor = createColumnsEditor();
    const current = editor.document as LensBlock[];

    // A column list with one column becomes the blocks of that column. Else
    // the conversion would fill the column list with a new column.
    const result = parseJSON(
      editor,
      [
        {
          id: "list",
          type: "columnList",
          children: [
            {
              id: "c1",
              type: "column",
              children: [{ id: "a", type: "paragraph", content: "Alpha" }],
            },
          ],
        },
      ],
      current,
      current,
    );

    const blocks = result.error === undefined ? result.blocks : [];
    expect(blocks.map(({ id, type }) => [id, type])).toEqual([
      ["a", "paragraph"],
    ]);
  });
});
