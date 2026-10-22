// @vitest-environment node
import { afterEach, expect, it } from "vite-plus/test";
import { ySyncPluginKey, yUndoPluginKey } from "y-prosemirror";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { blocksToYXmlFragment } from "../utils.js";
import { ForkYDocExtension } from "./ForkYDoc.js";
import { withCollaboration } from "./index.js";
import { YCursorExtension } from "./YCursorPlugin.js";
import { createYjsVersionView } from "./Versioning.js";

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    cleanup();
  }
});

it("switches version snapshots without reconnecting live sync or cursors", () => {
  const doc = new Y.Doc();
  const options = {
    fragment: doc.getXmlFragment("doc"),
    user: { name: "Test", color: "red" },
  };
  const editor = BlockNoteEditor.create(
    withCollaboration({ collaboration: options }),
  );
  cleanups.push(() => doc.destroy());
  cleanups.push(() => editor._tiptapEditor.destroy());
  editor.replaceBlocks(editor.document, [
    { type: "paragraph", content: "Saved" },
  ]);
  blocksToYXmlFragment(editor, editor.document, options.fragment);
  editor.prosemirrorView.updateState(
    editor.prosemirrorState.reconfigure({
      plugins: editor._tiptapEditor.extensionManager.plugins,
    }),
  );
  const view = createYjsVersionView(editor, options.fragment).open();
  cleanups.push(() => view.close());
  const content = view.current.content;
  view.show({ content, target: { type: "current" } });
  const firstFork: Y.Doc = ySyncPluginKey.getState(editor.prosemirrorState).type
    .doc;
  const fork = editor.getExtension(ForkYDocExtension)!;
  let reconnects = 0;
  const unsubscribe = fork.store.subscribe(() => {
    if (!fork.store.state.isForked) {
      reconnects++;
    }
  });
  cleanups.push(unsubscribe);
  view.show({ content, target: { type: "current" } });
  expect(reconnects).toBe(0);
  expect(editor.getExtension(YCursorExtension)).toBeUndefined();
  expect(firstFork.isDestroyed).toBe(true);
  expect(ySyncPluginKey.getState(editor.prosemirrorState).type).not.toBe(
    options.fragment,
  );
  view.close();
  expect(reconnects).toBe(1);
  expect(ySyncPluginKey.getState(editor.prosemirrorState).type).toBe(
    options.fragment,
  );
});

function findText(fragment: Y.XmlFragment): Y.XmlText | undefined {
  for (const node of fragment.toArray()) {
    if (node instanceof Y.XmlText) {
      return node;
    }
    if (node instanceof Y.XmlElement) {
      const text = findText(node);
      if (text) {
        return text;
      }
    }
  }
  return undefined;
}

function replaceText(fragment: Y.XmlFragment, content: string) {
  const text = findText(fragment);
  if (!text || !fragment.doc) {
    throw new Error("Expected a populated collaboration fragment");
  }
  fragment.doc.transact(() => {
    text.delete(0, text.length);
    text.insert(0, content);
  }, ySyncPluginKey);
}

it.each([false, true])(
  "restores the original cursor and releases the fork document (keepChanges: %s)",
  (keepChanges) => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment("doc");
    const awareness = new Awareness(doc);
    const editor = BlockNoteEditor.create(
      withCollaboration({
        collaboration: {
          fragment,
          provider: { awareness },
          user: { name: "Initial", color: "red" },
        },
      }),
    );
    cleanups.push(() => doc.destroy());
    cleanups.push(() => awareness.destroy());
    cleanups.push(() => editor._tiptapEditor.destroy());
    editor.replaceBlocks(editor.document, [
      { type: "paragraph", content: "Original" },
    ]);
    blocksToYXmlFragment(editor, editor.document, fragment);
    // Install real state plugins without DOM rendering or plugin views.
    editor.prosemirrorView.updateState(
      editor.prosemirrorState.reconfigure({
        plugins: editor._tiptapEditor.extensionManager.plugins,
      }),
    );
    const originalUndo: Y.UndoManager = yUndoPluginKey.getState(
      editor.prosemirrorState,
    )!.undoManager;
    cleanups.push(() => originalUndo.destroy());
    const cursor = editor.getExtension(YCursorExtension)!;
    cursor.updateUser({ name: "Updated", color: "blue" });
    awareness.setLocalStateField("cursor", {
      anchor: "published",
      head: "published",
    });
    const fork = editor.getExtension(ForkYDocExtension)!;
    fork.fork();
    const forkFragment: Y.XmlFragment = ySyncPluginKey.getState(
      editor.prosemirrorState,
    ).type;
    const forkDoc = forkFragment.doc!;
    const forkUndo: Y.UndoManager = yUndoPluginKey.getState(
      editor.prosemirrorState,
    )!.undoManager;
    cleanups.push(() => {
      forkUndo.destroy();
      forkDoc.destroy();
    });
    expect(editor.getExtension(YCursorExtension)).toBeUndefined();
    expect(awareness.getLocalState()?.cursor).toBeNull();
    expect(forkDoc).not.toBe(doc);
    expect(forkDoc.isDestroyed).toBe(false);
    replaceText(forkFragment, "Forked");
    fork.merge({ keepChanges });
    const restoredUndo: Y.UndoManager = yUndoPluginKey.getState(
      editor.prosemirrorState,
    )!.undoManager;
    cleanups.push(() => restoredUndo.destroy());
    expect(editor.getExtension(YCursorExtension) === cursor).toBe(true);
    expect(cursor.getUser()).toEqual({ name: "Updated", color: "blue" });
    expect(
      ySyncPluginKey.getState(editor.prosemirrorState).type === fragment,
    ).toBe(true);
    expect(findText(fragment)?.toString()).toBe(
      keepChanges ? "Forked" : "Original",
    );
    expect(forkDoc.isDestroyed).toBe(true);
    expect(doc.isDestroyed).toBe(false);
    fork.merge({ keepChanges });
    expect(editor.getExtension(YCursorExtension) === cursor).toBe(true);
  },
);

it("isolates fork undo and preserves original undo/redo history", () => {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment("doc");
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment,
        user: { name: "Test", color: "red" },
      },
    }),
  );
  cleanups.push(() => doc.destroy());
  cleanups.push(() => editor._tiptapEditor.destroy());
  editor.replaceBlocks(editor.document, [
    { type: "paragraph", content: "Initial" },
  ]);
  blocksToYXmlFragment(editor, editor.document, fragment);
  // Install the actual state plugins without mounting plugin views. Write real
  // Yjs transactions with the binding's origin; DOM hydration is not under test.
  editor.prosemirrorView.updateState(
    editor.prosemirrorState.reconfigure({
      plugins: editor._tiptapEditor.extensionManager.plugins,
    }),
  );
  const original: Y.UndoManager = yUndoPluginKey.getState(
    editor.prosemirrorState,
  )!.undoManager;
  cleanups.push(() => original.destroy());
  replaceText(fragment, "First");
  original.stopCapturing();
  replaceText(fragment, "Second");
  original.undo();
  expect(findText(fragment)?.toString()).toBe("First");
  const fork = editor.getExtension(ForkYDocExtension)!;
  fork.fork();
  const forkFragment: Y.XmlFragment = ySyncPluginKey.getState(
    editor.prosemirrorState,
  ).type;
  const forkUndo: Y.UndoManager = yUndoPluginKey.getState(
    editor.prosemirrorState,
  )!.undoManager;
  cleanups.push(() => {
    forkUndo.destroy();
    forkFragment.doc?.destroy();
  });
  replaceText(forkFragment, "Forked");
  forkUndo.undo();
  expect(findText(forkFragment)?.toString()).toBe("First");
  expect(findText(fragment)?.toString()).toBe("First");
  fork.merge({ keepChanges: false });
  const restored: Y.UndoManager = yUndoPluginKey.getState(
    editor.prosemirrorState,
  )!.undoManager;
  cleanups.push(() => restored.destroy());
  restored.redo();
  expect(findText(fragment)?.toString()).toBe("Second");
  restored.undo();
  expect(findText(fragment)?.toString()).toBe("First");
  restored.undo();
  expect(findText(fragment)?.toString()).toBe("Initial");
});
