import { describe, expect, it } from "vite-plus/test";

import type { LensBlock } from "../blocks/types.js";
import { createColumnsEditor, createEditor } from "../testUtil/fixtures.js";
import { parseJSON, replaceDisallowedIds } from "./parseJSON.js";

describe("parseJSON", () => {
  it("gives the blocks in the form that the document stores them", () => {
    const editor = createEditor([{ id: "p", type: "paragraph" }]);
    const current = editor.document as LensBlock[];

    const result = parseJSON(editor, [
      { id: "p", type: "paragraph", content: "Hello" },
    ]);

    const blocks = result.error === undefined ? result.blocks : [];
    expect(blocks.map(({ id }) => id)).toEqual(["p"]);
    // A missing field gets its default value, as in the document.
    expect(blocks[0].props).toEqual(current[0].props);
  });

  it("gives an error for blocks that do not fit the schema", () => {
    const editor = createEditor([{ id: "p", type: "paragraph" }]);

    expect(parseJSON(editor, [{ type: "unknown" } as never])).toEqual({
      error: "invalid-document",
    });
  });

  it("gives a later block with the ID of an earlier block the ID with a number", () => {
    const editor = createEditor([{ id: "p", type: "paragraph" }]);

    const result = parseJSON(editor, [
      { id: "p", type: "paragraph", content: "One" },
      { id: "p", type: "paragraph", content: "Two" },
    ]);

    const ids =
      result.error === undefined ? result.blocks.map(({ id }) => id) : [];
    // As in the current document and in a base (see `withDistinctIds`).
    expect(ids).toEqual(["p", "p-2"]);
  });

  it("gives an error for blocks that the conversion must fill", () => {
    const editor = createColumnsEditor();

    // A column list with one column does not fit the schema: the conversion
    // would add an empty column.
    const result = parseJSON(editor, [
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
    ]);

    expect(result).toEqual({ error: "invalid-document" });
  });
});

describe("replaceDisallowedIds", () => {
  it("gives a new ID to each block with an ID of the set, also in the children", () => {
    const block = (id: string, children: LensBlock[] = []): LensBlock => ({
      id,
      type: "paragraph",
      props: {},
      content: [],
      children,
    });

    const result = replaceDisallowedIds(
      [block("a", [block("d")]), block("b")],
      new Set(["d"]),
    );

    expect(result[0].id).toBe("a");
    expect(result[0].children[0].id).not.toBe("d");
    expect(result[1].id).toBe("b");
  });
});
