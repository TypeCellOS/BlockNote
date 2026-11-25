import { describe, expect } from "vite-plus/test";
import * as Y from "yjs";

import type { SetupEditor } from "../../../../tests/src/commands/browser/setupEditor.js";

// y-prosemirror and `@y/prosemirror` (Yjs 14) each make a plugin key with the
// name "y-sync". This file has no static import of `../yjs/index.js`: it loads
// `@y/prosemirror` first, so the key of y-prosemirror has the text "y-sync$1"
// (if the page did not load y-prosemirror before).
async function setupCollaborativeEditor(
  setupEditor: SetupEditor,
  fragment: Y.XmlFragment,
) {
  await import("@y/prosemirror");
  const { blocksToYDoc, withCollaboration } = await import("../yjs/index.js");
  const { editor } = await setupEditor({
    mountType: "dom",
    ...withCollaboration({
      extensions: [],
      collaboration: { fragment, user: { name: "Test", color: "red" } },
    }),
  });

  function applyRemoteChange(doc: Y.Doc, text: string) {
    const remoteDoc = blocksToYDoc(
      editor,
      [
        { type: "paragraph", content: text },
        { type: "paragraph", content: "Second block" },
      ],
      "doc",
    );
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(remoteDoc));
    remoteDoc.destroy();
  }

  return { editor, applyRemoteChange };
}

describe("y-prosemirror in a page that loaded the Yjs 14 binding first", () => {
  it("does not autolink text that arrives from another client", async ({
    onTestFinished,
    setupEditor,
  }) => {
    const doc = new Y.Doc();
    onTestFinished(() => doc.destroy());
    const { editor, applyRemoteChange } = await setupCollaborativeEditor(
      setupEditor,
      doc.getXmlFragment("doc"),
    );

    applyRemoteChange(doc, "Visit example.com");

    expect(editor.document.map((block) => block.content)).toEqual([
      [{ type: "text", text: "Visit example.com", styles: {} }],
      [{ type: "text", text: "Second block", styles: {} }],
    ]);
  });

  it("does not call onChange for the change of another client, if the caller excludes remote changes", async ({
    onTestFinished,
    setupEditor,
  }) => {
    const doc = new Y.Doc();
    onTestFinished(() => doc.destroy());
    const { editor, applyRemoteChange } = await setupCollaborativeEditor(
      setupEditor,
      doc.getXmlFragment("doc"),
    );
    let calls = 0;
    editor.onChange(() => {
      calls++;
    }, false);

    applyRemoteChange(doc, "Remote text");

    expect(calls).toBe(0);
  });

  it("gives the change of another client the source yjs-remote", async ({
    onTestFinished,
    setupEditor,
  }) => {
    const doc = new Y.Doc();
    onTestFinished(() => doc.destroy());
    const { editor, applyRemoteChange } = await setupCollaborativeEditor(
      setupEditor,
      doc.getXmlFragment("doc"),
    );
    const sources = new Set<string>();
    editor.onChange((_editor, context) => {
      for (const change of context.getChanges()) {
        sources.add(change.source.type);
      }
    });

    applyRemoteChange(doc, "Remote text");

    expect([...sources]).toEqual(["yjs-remote"]);
  });

  it("migrates a document of the older schema, which has the colors on the block container", async ({
    onTestFinished,
    setupEditor,
  }) => {
    const doc = new Y.Doc();
    onTestFinished(() => doc.destroy());
    const fragment = doc.getXmlFragment("doc");
    const paragraph = new Y.XmlElement("paragraph");
    paragraph.setAttribute("textAlignment", "left");
    paragraph.insert(0, [new Y.XmlText("Text")]);
    const blockContainer = new Y.XmlElement("blockContainer");
    blockContainer.setAttribute("id", "0");
    blockContainer.setAttribute("backgroundColor", "red");
    blockContainer.setAttribute("textColor", "blue");
    blockContainer.insert(0, [paragraph]);
    const blockGroup = new Y.XmlElement("blockGroup");
    blockGroup.insert(0, [blockContainer]);
    fragment.insert(0, [blockGroup]);

    const { editor } = await setupCollaborativeEditor(setupEditor, fragment);

    expect(editor.document[0].props).toMatchObject({
      backgroundColor: "red",
      textColor: "blue",
    });
  });
});
