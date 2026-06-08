import { expect, it } from "vitest";
import * as Y from "@y/y";
import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { moveColorAttributes } from "./moveColorAttributes.js";
import { pmToFragment } from "@y/prosemirror";

it("can move color attributes on older documents", async () => {
  const doc = new Y.Doc();
  const fragment = doc.get("doc");
  const editor = BlockNoteEditor.create({
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
      },
    ],
  });

  // Because this was a previous schema, we are creating the YFragment manually
  const blockGroup = new Y.Type("blockGroup");
  const el = new Y.Type("blockContainer");
  el.setAttr("id", "0");
  el.setAttr("backgroundColor", "red");
  el.setAttr("textColor", "blue");
  const para = new Y.Type("paragraph");
  para.setAttr("textAlignment", "left");
  const text = new Y.Type();
  text.insert(0, "Welcome to this demo!");
  para.insert(0, [text]);
  el.insert(0, [para]);
  blockGroup.insert(0, [el]);
  fragment.insert(0, [blockGroup]);

  // Note that the blockContainer has the color attributes, but the paragraph does not.
  expect(fragment.toJSON()).toMatchInlineSnapshot(
    `
    {
      "children": [
        {
          "children": [
            {
              "attrs": {
                "backgroundColor": "red",
                "id": "0",
                "textColor": "blue",
              },
              "children": [
                {
                  "attrs": {
                    "textAlignment": "left",
                  },
                  "children": [
                    {
                      "children": [
                        "Welcome to this demo!",
                      ],
                    },
                  ],
                  "name": "paragraph",
                },
              ],
              "name": "blockContainer",
            },
          ],
          "name": "blockGroup",
        },
      ],
    }
  `,
  );

  const tr = editor.prosemirrorState.tr;
  moveColorAttributes(fragment, tr);
  // Note that the color attributes have been moved to the paragraph.
  expect(JSON.stringify(tr.doc.toJSON())).toMatchInlineSnapshot(
    `"{"type":"doc","content":[{"type":"blockGroup","content":[{"type":"blockContainer","attrs":{"id":"0"},"content":[{"type":"paragraph","attrs":{"backgroundColor":"red","textColor":"blue","textAlignment":"left"},"content":[{"type":"text","text":"Welcome to this demo!"}]}]}]}]}"`,
  );
});

it("does not move color attributes on newer documents", async () => {
  const doc = new Y.Doc();
  const fragment = doc.get("doc");
  const editor = BlockNoteEditor.create({
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
        props: {
          backgroundColor: "red",
          textColor: "blue",
          // Set to non-default value to ensure it is not overridden by the migration rule.
          textAlignment: "right",
        },
      },
    ],
  });

  pmToFragment(editor.prosemirrorState.doc, fragment);

  expect(fragment.toJSON()).toMatchInlineSnapshot(
    // The color attributes are on the paragraph, not the blockContainer.
    `
    {
      "children": [
        {
          "children": [
            {
              "attrs": {
                "id": "0",
              },
              "children": [
                {
                  "attrs": {
                    "backgroundColor": "red",
                    "textAlignment": "right",
                    "textColor": "blue",
                  },
                  "children": [
                    "Welcome to this demo!",
                  ],
                  "name": "paragraph",
                },
              ],
              "name": "blockContainer",
            },
          ],
          "name": "blockGroup",
        },
      ],
    }
  `,
  );

  const tr = editor.prosemirrorState.tr;
  moveColorAttributes(fragment, tr);
  // The document will be unchanged because the color attributes are already on the paragraph.
  expect(tr.docChanged).toBe(false);
});

it("can move color attributes on older documents multiple times", async () => {
  const doc = new Y.Doc();
  const fragment = doc.get("doc");
  const editor = BlockNoteEditor.create({
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
      },
    ],
  });

  // Because this was a previous schema, we are creating the YFragment manually
  const blockGroup = new Y.Type("blockGroup");
  const el = new Y.Type("blockContainer");
  el.setAttr("id", "0");
  el.setAttr("backgroundColor", "red");
  el.setAttr("textColor", "blue");
  const para = new Y.Type("paragraph");
  para.setAttr("textAlignment", "left");
  const text = new Y.Type();
  text.insert(0, "Welcome to this demo!");
  para.insert(0, [text]);
  el.insert(0, [para]);
  blockGroup.insert(0, [el]);
  fragment.insert(0, [blockGroup]);

  // Note that the blockContainer has the color attributes, but the paragraph does not.
  expect(fragment.toJSON()).toMatchInlineSnapshot(
    `
    {
      "children": [
        {
          "children": [
            {
              "attrs": {
                "backgroundColor": "red",
                "id": "0",
                "textColor": "blue",
              },
              "children": [
                {
                  "attrs": {
                    "textAlignment": "left",
                  },
                  "children": [
                    {
                      "children": [
                        "Welcome to this demo!",
                      ],
                    },
                  ],
                  "name": "paragraph",
                },
              ],
              "name": "blockContainer",
            },
          ],
          "name": "blockGroup",
        },
      ],
    }
  `,
  );

  const tr = editor.prosemirrorState.tr;
  moveColorAttributes(fragment, tr);
  // Note that the color attributes have been moved to the paragraph.
  expect(JSON.stringify(tr.doc.toJSON())).toMatchInlineSnapshot(
    `"{"type":"doc","content":[{"type":"blockGroup","content":[{"type":"blockContainer","attrs":{"id":"0"},"content":[{"type":"paragraph","attrs":{"backgroundColor":"red","textColor":"blue","textAlignment":"left"},"content":[{"type":"text","text":"Welcome to this demo!"}]}]}]}]}"`,
  );

  el.setAttr("backgroundColor", "green");
  el.setAttr("textColor", "yellow");

  expect(fragment.toJSON()).toMatchInlineSnapshot(
    `
    {
      "children": [
        {
          "children": [
            {
              "attrs": {
                "backgroundColor": "green",
                "id": "0",
                "textColor": "yellow",
              },
              "children": [
                {
                  "attrs": {
                    "textAlignment": "left",
                  },
                  "children": [
                    {
                      "children": [
                        "Welcome to this demo!",
                      ],
                    },
                  ],
                  "name": "paragraph",
                },
              ],
              "name": "blockContainer",
            },
          ],
          "name": "blockGroup",
        },
      ],
    }
  `,
  );

  const nextTr = editor.prosemirrorState.tr;
  moveColorAttributes(fragment, nextTr);
  // Note that the color attributes have been moved to the paragraph.
  expect(JSON.stringify(nextTr.doc.toJSON())).toMatchInlineSnapshot(
    `"{"type":"doc","content":[{"type":"blockGroup","content":[{"type":"blockContainer","attrs":{"id":"0"},"content":[{"type":"paragraph","attrs":{"backgroundColor":"green","textColor":"yellow","textAlignment":"left"},"content":[{"type":"text","text":"Welcome to this demo!"}]}]}]}]}"`,
  );
});
