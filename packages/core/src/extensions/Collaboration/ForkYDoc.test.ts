import { expect, it } from "vitest";
import * as Y from "@y/y";
import { Awareness } from "@y/protocols/awareness";
import { BlockNoteEditor } from "../../index.js";
import { ForkYDocExtension } from "./ForkYDoc.js";

/**
 * @vitest-environment jsdom
 *
 * NOTE: these tests are skipped. The fork/merge feature (`ForkYDocExtension`) is
 * currently disabled - it is commented out of `CollaborationExtension` in
 * Collaboration.ts and has not been migrated to the Yjs v14 binding (it depends
 * on the old undo-stack + plugin re-registration semantics). On top of that, the
 * file snapshots here are the v13 `fragment.toJSON()` HTML format, whereas v14
 * `toJSON()` returns an object. Re-enable + re-snapshot once the fork feature is
 * ported to v14. This is unrelated to attribution.
 */
it.skip("can fork a document", async () => {
  const doc = new Y.Doc();
  const fragment = doc.get("doc");
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

  editor.getExtension(ForkYDocExtension)!.fork();

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

it.skip("can merge a document", async () => {
  const doc = new Y.Doc();
  const fragment = doc.get("doc");
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

  editor.getExtension(ForkYDocExtension)!.fork();

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

  editor.getExtension(ForkYDocExtension)!.merge({ keepChanges: false });

  await expect(fragment.toJSON()).toMatchFileSnapshot(
    "__snapshots__/fork-yjs-snap.html",
  );
  await expect(editor.document).toMatchFileSnapshot(
    "__snapshots__/fork-yjs-snap-editor.json",
  );
});

it.skip("can fork an keep the changes to the original document", async () => {
  const doc = new Y.Doc();
  const fragment = doc.get("doc");
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

  editor.getExtension(ForkYDocExtension)!.fork();

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

  editor.getExtension(ForkYDocExtension)!.merge({ keepChanges: true });

  await expect(fragment.toJSON()).toMatchFileSnapshot(
    "__snapshots__/fork-yjs-snap-forked.html",
  );
  await expect(editor.document).toMatchFileSnapshot(
    "__snapshots__/fork-yjs-snap-editor-forked.json",
  );
});
