import { expect, it } from "vitest";
import * as Y from "yjs";
import { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import { moveColorAttributes } from "./moveColorAttributes.js";
import { prosemirrorJSONToYXmlFragment } from "y-prosemirror";

it("can move color attributes on older documents", async () => {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment("doc");
  const editor = BlockNoteEditor.create({
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
      },
    ],
  });

  // Because this was a previous schema, we are creating the YFragment manually
  const blockGroup = new Y.XmlElement("blockGroup");
  const el = new Y.XmlElement("blockContainer");
  el.setAttribute("id", "0");
  el.setAttribute("backgroundColor", "red");
  el.setAttribute("textColor", "blue");
  const para = new Y.XmlElement("paragraph");
  para.setAttribute("textAlignment", "left");
  para.insert(0, [new Y.XmlText("Welcome to this demo!")]);
  el.insert(0, [para]);
  blockGroup.insert(0, [el]);
  fragment.insert(0, [blockGroup]);

  // Note that the blockContainer has the color attributes, but the paragraph does not.
  expect(fragment.toJSON()).toMatchInlineSnapshot(
    `"<blockgroup><blockcontainer backgroundColor="red" id="0" textColor="blue"><paragraph textAlignment="left">Welcome to this demo!</paragraph></blockcontainer></blockgroup>"`,
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
  const fragment = doc.getXmlFragment("doc");
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

  prosemirrorJSONToYXmlFragment(
    editor.pmSchema,
    JSON.parse(JSON.stringify(editor.prosemirrorState.doc.toJSON())),
    fragment,
  );

  expect(fragment.toJSON()).toMatchInlineSnapshot(
    // The color attributes are on the paragraph, not the blockContainer.
    `"<blockgroup><blockcontainer id="0"><paragraph backgroundColor="red" textAlignment="right" textColor="blue">Welcome to this demo!</paragraph></blockcontainer></blockgroup>"`,
  );

  const tr = editor.prosemirrorState.tr;
  moveColorAttributes(fragment, tr);
  // The document will be unchanged because the color attributes are already on the paragraph.
  expect(tr.docChanged).toBe(false);
});

it("can move color attributes on older documents multiple times", async () => {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment("doc");
  const editor = BlockNoteEditor.create({
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
      },
    ],
  });

  // Because this was a previous schema, we are creating the YFragment manually
  const blockGroup = new Y.XmlElement("blockGroup");
  const el = new Y.XmlElement("blockContainer");
  el.setAttribute("id", "0");
  el.setAttribute("backgroundColor", "red");
  el.setAttribute("textColor", "blue");
  const para = new Y.XmlElement("paragraph");
  para.setAttribute("textAlignment", "left");
  para.insert(0, [new Y.XmlText("Welcome to this demo!")]);
  el.insert(0, [para]);
  blockGroup.insert(0, [el]);
  fragment.insert(0, [blockGroup]);

  // Note that the blockContainer has the color attributes, but the paragraph does not.
  expect(fragment.toJSON()).toMatchInlineSnapshot(
    `"<blockgroup><blockcontainer backgroundColor="red" id="0" textColor="blue"><paragraph textAlignment="left">Welcome to this demo!</paragraph></blockcontainer></blockgroup>"`,
  );

  const tr = editor.prosemirrorState.tr;
  moveColorAttributes(fragment, tr);
  // Note that the color attributes have been moved to the paragraph.
  expect(JSON.stringify(tr.doc.toJSON())).toMatchInlineSnapshot(
    `"{"type":"doc","content":[{"type":"blockGroup","content":[{"type":"blockContainer","attrs":{"id":"0"},"content":[{"type":"paragraph","attrs":{"backgroundColor":"red","textColor":"blue","textAlignment":"left"},"content":[{"type":"text","text":"Welcome to this demo!"}]}]}]}]}"`,
  );

  el.setAttribute("backgroundColor", "green");
  el.setAttribute("textColor", "yellow");

  expect(fragment.toJSON()).toMatchInlineSnapshot(
    `"<blockgroup><blockcontainer backgroundColor="green" id="0" textColor="yellow"><paragraph textAlignment="left">Welcome to this demo!</paragraph></blockcontainer></blockgroup>"`,
  );

  const nextTr = editor.prosemirrorState.tr;
  moveColorAttributes(fragment, nextTr);
  // Note that the color attributes have been moved to the paragraph.
  expect(JSON.stringify(nextTr.doc.toJSON())).toMatchInlineSnapshot(
    `"{"type":"doc","content":[{"type":"blockGroup","content":[{"type":"blockContainer","attrs":{"id":"0"},"content":[{"type":"paragraph","attrs":{"backgroundColor":"green","textColor":"yellow","textAlignment":"left"},"content":[{"type":"text","text":"Welcome to this demo!"}]}]}]}]}"`,
  );
});
