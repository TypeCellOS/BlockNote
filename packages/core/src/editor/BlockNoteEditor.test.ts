import { expect, it } from "vitest";
import { getBlockInfoFromPos } from "../api/getBlockInfoFromPos";
import { BlockNoteEditor } from "./BlockNoteEditor";

/**
 * @vitest-environment jsdom
 */
it("creates an editor", () => {
  const editor = BlockNoteEditor.create();
  const blockInfo = getBlockInfoFromPos(editor._tiptapEditor.state.doc, 2);
  expect(blockInfo?.contentNode.type.name).toEqual("paragraph");
});

it("immediately replaces doc", async () => {
  const editor = BlockNoteEditor.create();
  const blocks = await editor.tryParseMarkdownToBlocks(
    "This is a normal text\n\n# And this is a large heading"
  );
  editor.replaceBlocks(editor.document, blocks);
  expect(editor.document).toMatchInlineSnapshot(`
    [
      {
        "children": [],
        "content": [
          {
            "styles": {},
            "text": "This is a normal text",
            "type": "text",
          },
        ],
        "id": "1",
        "props": {
          "backgroundColor": "default",
          "textAlignment": "left",
          "textColor": "default",
        },
        "type": "paragraph",
      },
      {
        "children": [],
        "content": [
          {
            "styles": {},
            "text": "And this is a large heading",
            "type": "text",
          },
        ],
        "id": "2",
        "props": {
          "backgroundColor": "default",
          "level": 1,
          "textAlignment": "left",
          "textColor": "default",
        },
        "type": "heading",
      },
    ]
  `);
});
