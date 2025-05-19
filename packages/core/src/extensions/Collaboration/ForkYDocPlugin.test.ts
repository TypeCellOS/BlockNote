import { expect, it } from "vitest";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { BlockNoteEditor } from "../../index.js";

/**
 * @vitest-environment jsdom
 */
it("can fork a document", async () => {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment("doc");
  const editor = BlockNoteEditor.create({
    collaboration: {
      fragment,
      user: { name: "Hello", color: "#FFFFFF" },
      provider: {
        awareness: new Awareness(doc),
      },
    },
  });

  const div = document.createElement("div");
  editor.mount(div);

  editor.replaceBlocks(editor.document, [
    {
      type: "paragraph",
      content: [{ text: "Hello", styles: {}, type: "text" }],
    },
  ]);

  await expect(fragment.toJSON()).toMatchFileSnapshot(
    "__snapshots__/fork-yjs-snap.html",
  );
  await expect(editor.document).toMatchFileSnapshot(
    "__snapshots__/fork-yjs-snap-editor.json",
  );

  editor.forkYDocPlugin!.fork();

  editor.replaceBlocks(editor.document, [
    {
      type: "paragraph",
      content: [{ text: "Hello World", styles: {}, type: "text" }],
    },
  ]);

  await expect(fragment.toJSON()).toMatchFileSnapshot(
    "__snapshots__/fork-yjs-snap.html",
  );
  await expect(editor.document).toMatchFileSnapshot(
    "__snapshots__/fork-yjs-snap-editor-forked.json",
  );
});

it("can merge a document", async () => {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment("doc");
  const editor = BlockNoteEditor.create({
    collaboration: {
      fragment,
      user: { name: "Hello", color: "#FFFFFF" },
      provider: {
        awareness: new Awareness(doc),
      },
    },
  });

  const div = document.createElement("div");
  editor.mount(div);

  editor.replaceBlocks(editor.document, [
    {
      type: "paragraph",
      content: [{ text: "Hello", styles: {}, type: "text" }],
    },
  ]);

  await expect(fragment.toJSON()).toMatchFileSnapshot(
    "__snapshots__/fork-yjs-snap.html",
  );
  await expect(editor.document).toMatchFileSnapshot(
    "__snapshots__/fork-yjs-snap-editor.json",
  );

  editor.forkYDocPlugin!.fork();

  editor.replaceBlocks(editor.document, [
    {
      type: "paragraph",
      content: [{ text: "Hello World", styles: {}, type: "text" }],
    },
  ]);

  await expect(fragment.toJSON()).toMatchFileSnapshot(
    "__snapshots__/fork-yjs-snap.html",
  );
  await expect(editor.document).toMatchFileSnapshot(
    "__snapshots__/fork-yjs-snap-editor-forked.json",
  );

  editor.forkYDocPlugin!.merge({ keepChanges: false });

  await expect(fragment.toJSON()).toMatchFileSnapshot(
    "__snapshots__/fork-yjs-snap.html",
  );
  await expect(editor.document).toMatchFileSnapshot(
    "__snapshots__/fork-yjs-snap-editor.json",
  );
});

it("can fork an keep the changes to the original document", async () => {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment("doc");
  const editor = BlockNoteEditor.create({
    collaboration: {
      fragment,
      user: { name: "Hello", color: "#FFFFFF" },
      provider: {
        awareness: new Awareness(doc),
      },
    },
  });

  const div = document.createElement("div");
  editor.mount(div);

  editor.replaceBlocks(editor.document, [
    {
      type: "paragraph",
      content: [{ text: "Hello", styles: {}, type: "text" }],
    },
  ]);

  await expect(fragment.toJSON()).toMatchFileSnapshot(
    "__snapshots__/fork-yjs-snap.html",
  );
  await expect(editor.document).toMatchFileSnapshot(
    "__snapshots__/fork-yjs-snap-editor.json",
  );

  editor.forkYDocPlugin!.fork();

  editor.replaceBlocks(editor.document, [
    {
      type: "paragraph",
      content: [{ text: "Hello World", styles: {}, type: "text" }],
    },
  ]);

  await expect(fragment.toJSON()).toMatchFileSnapshot(
    "__snapshots__/fork-yjs-snap.html",
  );
  await expect(editor.document).toMatchFileSnapshot(
    "__snapshots__/fork-yjs-snap-editor-forked.json",
  );

  editor.forkYDocPlugin!.merge({ keepChanges: true });

  await expect(fragment.toJSON()).toMatchFileSnapshot(
    "__snapshots__/fork-yjs-snap-forked.html",
  );
  await expect(editor.document).toMatchFileSnapshot(
    "__snapshots__/fork-yjs-snap-editor-forked.json",
  );
});
