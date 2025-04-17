import { expect, it } from "vitest";
import {
  getBlockInfo,
  getNearestBlockPos,
} from "../api/getBlockInfoFromPos.js";
import { BlockNoteEditor } from "./BlockNoteEditor.js";

/**
 * @vitest-environment jsdom
 */
it("creates an editor", () => {
  const editor = BlockNoteEditor.create();
  const posInfo = editor.transact((tr) => getNearestBlockPos(tr.doc, 2));
  const info = getBlockInfo(posInfo);
  expect(info.blockNoteType).toEqual("paragraph");
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
  expect(await editor.blocksToFullHTML(editor.document)).toMatchInlineSnapshot(
    `"<div class="bn-block-group" data-node-type="blockGroup"><div class="bn-block-outer" data-node-type="blockOuter" data-id="1" id="1"><div class="bn-block" data-node-type="blockContainer" data-id="1" id="1"><div class="bn-block-content" data-content-type="paragraph"><p class="bn-inline-content">This is a normal text</p></div></div></div><div class="bn-block-outer" data-node-type="blockOuter" data-id="2" id="2"><div class="bn-block" data-node-type="blockContainer" data-id="2" id="2"><div class="bn-block-content" data-content-type="heading"><h1 class="bn-inline-content">And this is a large heading</h1></div></div></div></div>"`
  );
});

it("block prop types", () => {
  // this test checks whether the block props are correctly typed in typescript
  const editor = BlockNoteEditor.create();
  const block = editor.document[0];
  if (block.type === "paragraph") {
    // @ts-expect-error
    const level = block.props.level; // doesn't have level prop

    // eslint-disable-next-line
    expect(level).toBe(undefined);
  }

  if (block.type === "heading") {
    const level = block.props.level; // does have level prop

    // eslint-disable-next-line
    expect(level).toBe(1);
  }
});
