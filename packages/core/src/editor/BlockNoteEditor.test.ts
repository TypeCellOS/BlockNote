import { expect, it } from "vitest";
import * as Y from "yjs";

import {
  getBlockInfo,
  getNearestBlockPos,
} from "../api/getBlockInfoFromPos.js";
import { BlockNoteEditor } from "./BlockNoteEditor.js";
import { BlocksChanged } from "../api/getBlocksChangedByTransaction.js";

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
    "This is a normal text\n\n# And this is a large heading",
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
          "isToggleable": false,
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
    "This is a normal text\n\n# And this is a large heading",
  );
  editor.replaceBlocks(editor.document, blocks);
  expect(await editor.blocksToFullHTML(editor.document)).toMatchInlineSnapshot(
    `"<div class="bn-block-group" data-node-type="blockGroup"><div class="bn-block-outer" data-node-type="blockOuter" data-id="1" id="1"><div class="bn-block" data-node-type="blockContainer" data-id="1" id="1"><div class="bn-block-content" data-content-type="paragraph"><p class="bn-inline-content">This is a normal text</p></div></div></div><div class="bn-block-outer" data-node-type="blockOuter" data-id="2" id="2"><div class="bn-block" data-node-type="blockContainer" data-id="2" id="2"><div class="bn-block-content" data-content-type="heading"><h1 class="bn-inline-content">And this is a large heading</h1></div></div></div></div>"`,
  );
});

it("updates block", () => {
  const editor = BlockNoteEditor.create();
  editor.updateBlock(editor.document[0], {
    content: "hello",
  });
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

it("onMount and onUnmount", async () => {
  const editor = BlockNoteEditor.create();
  let mounted = false;
  let unmounted = false;
  editor.onMount(() => {
    mounted = true;
  });
  editor.onUnmount(() => {
    unmounted = true;
  });
  editor.mount(document.createElement("div"));
  expect(mounted).toBe(true);
  expect(unmounted).toBe(false);
  editor.unmount();
  // expect the unmount event to not have been triggered yet, since it waits 2 ticks
  // expect(unmounted).toBe(false);
  // wait 3 ticks to ensure the unmount event is triggered
  await new Promise((resolve) => setTimeout(resolve, 3));
  expect(mounted).toBe(true);
  expect(unmounted).toBe(true);
});

it("sets an initial block id when using Y.js", async () => {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment("doc");
  let transactionCount = 0;
  const editor = BlockNoteEditor.create({
    collaboration: {
      fragment,
      user: { name: "Hello", color: "#FFFFFF" },
    },
    _tiptapOptions: {
      onTransaction: () => {
        transactionCount++;
      },
    },
  });

  editor.mount(document.createElement("div"));

  expect(editor.prosemirrorState.doc.toJSON()).toMatchInlineSnapshot(`
    {
      "content": [
        {
          "content": [
            {
              "attrs": {
                "id": "initialBlockId",
              },
              "content": [
                {
                  "attrs": {
                    "backgroundColor": "default",
                    "textAlignment": "left",
                    "textColor": "default",
                  },
                  "type": "paragraph",
                },
              ],
              "type": "blockContainer",
            },
          ],
          "type": "blockGroup",
        },
      ],
      "type": "doc",
    }
  `);
  expect(transactionCount).toBe(1);
  // The fragment should not be modified yet, since the editor's content is only the initial content
  expect(fragment.toJSON()).toMatchInlineSnapshot(`""`);

  editor.replaceBlocks(editor.document, [
    {
      type: "paragraph",
      content: [{ text: "Hello", styles: {}, type: "text" }],
    },
  ]);
  expect(transactionCount).toBe(2);
  // Only after a real modification is made, will the fragment be updated
  expect(fragment.toJSON()).toMatchInlineSnapshot(
    `"<blockgroup><blockcontainer id="0"><paragraph backgroundColor="default" textAlignment="left" textColor="default">Hello</paragraph></blockcontainer><blockcontainer id="1"><paragraph backgroundColor="default" textAlignment="left" textColor="default"></paragraph></blockcontainer></blockgroup>"`,
  );
});

it("onBeforeChange", () => {
  const editor = BlockNoteEditor.create();
  let beforeChangeCalled = false;
  let changes: BlocksChanged<any, any, any> = [];
  editor.onBeforeChange(({ getChanges }) => {
    beforeChangeCalled = true;
    changes = getChanges();
    return true;
  });
  editor.mount(document.createElement("div"));
  editor.replaceBlocks(editor.document, [
    {
      type: "paragraph",
      content: [{ text: "Hello", styles: {}, type: "text" }],
    },
  ]);
  expect(beforeChangeCalled).toBe(true);
  expect(changes).toMatchInlineSnapshot(`
    [
      {
        "block": {
          "children": [],
          "content": [],
          "id": "3",
          "props": {
            "backgroundColor": "default",
            "textAlignment": "left",
            "textColor": "default",
          },
          "type": "paragraph",
        },
        "prevBlock": undefined,
        "source": {
          "type": "local",
        },
        "type": "insert",
      },
      {
        "block": {
          "children": [],
          "content": [],
          "id": "2",
          "props": {
            "backgroundColor": "default",
            "textAlignment": "left",
            "textColor": "default",
          },
          "type": "paragraph",
        },
        "prevBlock": undefined,
        "source": {
          "type": "local",
        },
        "type": "delete",
      },
    ]
  `);
});
