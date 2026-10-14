// @vitest-environment node
import { Awareness } from "@y/protocols/awareness";
import { ySyncPluginKey } from "@y/prosemirror";
import * as Y from "@y/y";
import { afterEach, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { blocksToYType } from "../utils.js";
import { ForkYDocExtension } from "./ForkYDoc.js";
import { withCollaboration } from "./index.js";
import { YCursorExtension } from "./YCursorPlugin.js";

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    cleanup();
  }
});

it.each([false, true])(
  "restores the original cursor and releases the fork document (keepChanges: %s)",
  (keepChanges) => {
    const doc = new Y.Doc();
    const fragment = doc.get("doc");
    const awareness = new Awareness(doc);
    const collaboration = {
      fragment,
      provider: { awareness },
      user: { name: "Initial", color: "red" },
    };
    const editor = BlockNoteEditor.create(
      withCollaboration({
        collaboration,
        extensions: [ForkYDocExtension(collaboration)],
      }),
    );
    cleanups.push(() => doc.destroy());
    cleanups.push(() => awareness.destroy());
    cleanups.push(() => editor._tiptapEditor.destroy());
    editor.replaceBlocks(editor.document, [
      { type: "paragraph", content: "Original" },
    ]);
    blocksToYType(editor, editor.document, fragment);
    // Use actual state plugins. Binding configuration and extension identity
    // do not require DOM rendering or a plugin view.
    editor.prosemirrorView.updateState(
      editor.prosemirrorState.reconfigure({
        plugins: editor._tiptapEditor.extensionManager.plugins,
      }),
    );
    const cursor = editor.getExtension(YCursorExtension)!;
    cursor.updateUser({ name: "Updated", color: "blue" });
    awareness.setLocalStateField("cursor", {
      anchor: "published",
      head: "published",
    });
    const fork = editor.getExtension(ForkYDocExtension)!;
    fork.fork();
    const forkedDoc: Y.Doc = ySyncPluginKey.getState(editor.prosemirrorState)
      .ytype.doc;
    cleanups.push(() => forkedDoc.destroy());
    expect(editor.getExtension(YCursorExtension)).toBeUndefined();
    expect(awareness.getLocalState()?.cursor).toBeNull();
    expect(forkedDoc).not.toBe(doc);
    expect(forkedDoc.isDestroyed).toBe(false);
    fork.merge({ keepChanges });
    expect(editor.getExtension(YCursorExtension) === cursor).toBe(true);
    expect(cursor.getUser()).toEqual({ name: "Updated", color: "blue" });
    expect(
      ySyncPluginKey.getState(editor.prosemirrorState).ytype === fragment,
    ).toBe(true);
    expect(forkedDoc.isDestroyed).toBe(true);
    expect(doc.isDestroyed).toBe(false);
    fork.merge({ keepChanges });
    expect(editor.getExtension(YCursorExtension) === cursor).toBe(true);
  },
);
