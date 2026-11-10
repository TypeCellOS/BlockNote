// @vitest-environment node
import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { propsFit } from "./props.js";

const { blockSchema } = BlockNoteEditor.create().schema;

describe("propsFit", () => {
  it("accepts the props of the blocks of an editor", () => {
    const editor = BlockNoteEditor.create({
      initialContent: [
        { type: "heading", props: { level: 2 }, content: "Title" },
        { type: "checkListItem", props: { checked: true }, content: "Done" },
      ],
    });
    expect(propsFit(blockSchema, editor.document)).toBe(true);
  });

  it("accepts blocks without props, and an unknown type", () => {
    expect(propsFit(blockSchema, [{ content: "Text" }])).toBe(true);
    expect(propsFit(blockSchema, [{ type: "unknown" } as any])).toBe(true);
  });

  it.each([
    [
      "a value that is not in the values",
      { type: "heading", props: { level: "1 x" } },
    ],
    [
      "a value of the wrong type",
      { type: "checkListItem", props: { checked: "yes" } },
    ],
    ["an unknown prop", { type: "paragraph", props: { size: 3 } }],
    ["props that are not an object", { type: "paragraph", props: "x" }],
    [
      "a number that is not finite",
      { type: "heading", props: { level: Infinity } },
    ],
  ])("rejects %s", (_, block) => {
    expect(propsFit(blockSchema, [block as any])).toBe(false);
  });

  it("examines the props of the children", () => {
    expect(
      propsFit(blockSchema, [
        {
          type: "paragraph",
          children: [
            { type: "paragraph", props: { textAlignment: "diagonal" } },
          ],
        } as any,
      ]),
    ).toBe(false);
  });
});
