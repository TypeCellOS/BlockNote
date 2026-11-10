import { describe, expect, it } from "vite-plus/test";

import { setupTestEnv } from "./setupTestEnv.js";

const getEditor = setupTestEnv();

const column = (id: string, text: string) => ({
  type: "column" as const,
  id,
  children: [{ id: `${id}-p`, type: "paragraph" as const, content: text }],
});

// A column holds any block except a column list (`children.exclude`), as on
// `main`, where its node's content was `blockContainer+`.
describe("column children", () => {
  it("accept any block but a column list", () => {
    const { column, columnList, blockContainer } = getEditor().pmSchema.nodes;

    expect(column.spec.content).toBe("blockContainer+");
    expect(column.contentMatch.matchType(blockContainer)).not.toBeNull();
    expect(column.contentMatch.matchType(columnList)).toBeNull();
  });

  it("refuse a column list inserted through the API", () => {
    const editor = getEditor();
    editor.replaceBlocks(editor.document, [
      {
        type: "columnList",
        id: "cl-0",
        children: [column("col-1", "one"), column("col-2", "two")],
      },
    ]);

    expect(() =>
      editor.insertBlocks(
        [
          {
            type: "columnList",
            children: [column("in-1", "a"), column("in-2", "b")],
          },
        ],
        "col-1",
        "last-child",
      ),
    ).toThrow(/at "last-child" of block "col-1": no valid position/);
    expect(editor.getBlock("col-1")!.children.map((child) => child.id)).toEqual(
      ["col-1-p"],
    );
  });

  it("refuse a document with a column list in a column", () => {
    const editor = getEditor();

    expect(() =>
      editor.replaceBlocks(editor.document, [
        {
          type: "columnList",
          id: "cl-0",
          children: [
            {
              type: "column",
              id: "col-1",
              children: [
                {
                  type: "columnList",
                  id: "nested",
                  children: [column("in-1", "a"), column("in-2", "b")],
                },
              ],
            },
            column("col-2", "two"),
          ],
        },
      ]),
    ).toThrow(/Cannot create block "column": its children don't fit/);
  });
});
