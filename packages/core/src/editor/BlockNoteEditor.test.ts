import { expect, it } from "vitest";
import { getBlockInfoFromPos } from "../api/getBlockInfoFromPos.js";
import { BlockNoteEditor } from "./BlockNoteEditor.js";

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

it("adds id attribute when requested", async () => {
  const editor = BlockNoteEditor.create({
    setIdAttribute: true,
  });
  const blocks = await editor.tryParseMarkdownToBlocks(
    "This is a normal text\n\n# And this is a large heading"
  );
  editor.replaceBlocks(editor.document, blocks);
  expect(
    await editor.blocksToFullHTML(editor.document)
  ).toMatchInlineSnapshot(`"<div class="bn-block-group" data-node-type="blockGroup"><div class="bn-block-outer" data-node-type="blockOuter" data-id="1" id="1"><div class="bn-block" data-node-type="blockContainer" data-id="1" id="1"><div class="bn-block-content" data-content-type="paragraph"><p class="bn-inline-content">This is a normal text</p></div></div></div><div class="bn-block-outer" data-node-type="blockOuter" data-id="2" id="2"><div class="bn-block" data-node-type="blockContainer" data-id="2" id="2"><div class="bn-block-content" data-content-type="heading" data-level="1"><h1 class="bn-inline-content">And this is a large heading</h1></div></div></div></div>"`);
});
