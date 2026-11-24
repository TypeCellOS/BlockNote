import { expect, vi } from "vite-plus/test";
import * as Y from "yjs";

import { withCollaboration } from "../yjs/index.js";

it("adds id attribute when requested", async ({ setupEditor }) => {
  const { editor } = await setupEditor({
    mountType: false,
    setIdAttribute: true,
  });
  const blocks = editor.tryParseMarkdownToBlocks(
    "This is a normal text\n\n# And this is a large heading",
  );
  editor.replaceBlocks(editor.document, blocks);
  expect(editor.blocksToFullHTML(editor.document)).toMatchInlineSnapshot(
    `"<div class="bn-block-group" data-node-type="blockGroup"><div class="bn-block-outer" data-node-type="blockOuter" data-id="1" id="1"><div class="bn-block" data-node-type="blockContainer" data-id="1" id="1"><div class="bn-block-content" data-content-type="paragraph"><p class="bn-inline-content">This is a normal text</p></div></div></div><div class="bn-block-outer" data-node-type="blockOuter" data-id="2" id="2"><div class="bn-block" data-node-type="blockContainer" data-id="2" id="2"><div class="bn-block-content" data-content-type="heading"><h1 class="bn-inline-content">And this is a large heading</h1></div></div></div></div>"`,
  );
});

it("onMount and onUnmount", async ({ setupEditor }) => {
  const { editor } = await setupEditor({ mountType: false });
  let mounted = false;
  const onUnmount = vi.fn();
  editor.onMount(() => {
    mounted = true;
  });
  editor.onUnmount(onUnmount);
  editor.mount(document.createElement("div"));
  expect(mounted).toBe(true);
  expect(onUnmount).not.toHaveBeenCalled();
  editor.unmount();
  await expect.poll(() => onUnmount.mock.calls.length, { interval: 5 }).toBe(1);
});

it("sets an initial block id when using Y.js", async ({ setupEditor }) => {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment("doc");
  let transactionCount = 0;
  const { editor } = await setupEditor({
    mountType: "dom",
    ...withCollaboration({
      collaboration: {
        fragment,
        user: { name: "Hello", color: "#FFFFFF" },
      },
      _tiptapOptions: {
        onTransaction: () => {
          transactionCount++;
        },
      },
    }),
  });
  expect(editor.document).toEqual([
    {
      id: "initialBlockId",
      type: "paragraph",
      props: {
        backgroundColor: "default",
        textAlignment: "left",
        textColor: "default",
      },
      content: [],
      children: [],
    },
  ]);
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
  expect(fragment.toJSON()).toMatch(
    /^<blockgroup><blockcontainer id="[^"]+"><paragraph backgroundColor="default" textAlignment="left" textColor="default">Hello<\/paragraph><\/blockcontainer><\/blockgroup>$/,
  );
});

it("onBeforeChange", async ({ setupEditor }) => {
  const { editor } = await setupEditor({ mountType: "dom" });
  const onChange = vi.fn();
  editor.onBeforeChange(({ getChanges }) => {
    onChange(getChanges());
    return true;
  });
  editor.replaceBlocks(editor.document, [
    {
      type: "paragraph",
      content: [{ text: "Hello", styles: {}, type: "text" }],
    },
  ]);
  expect(onChange).toHaveBeenCalledOnce();
  expect(onChange.mock.calls[0]?.[0]).toMatchInlineSnapshot(`
    [
      {
        "block": {
          "children": [],
          "content": [
            {
              "styles": {},
              "text": "Hello",
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
          "id": "0",
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
