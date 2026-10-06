// @vitest-environment node
import {
  configureYProsemirror,
  ySyncPluginKey,
  yUndoPluginKey,
} from "@y/prosemirror";
import type { PluginView } from "prosemirror-state";
import { TextSelection } from "prosemirror-state";
import { afterEach, expect, it, vi } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { blocksToYDoc, yDocToBlocks } from "../utils.js";
import { withCollaboration } from "./index.js";
import { YUndoExtension } from "./YUndo.js";

const cleanups: Array<() => void> = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    cleanup();
  }
});

function createCollaborativeEditor() {
  const schemaEditor = BlockNoteEditor.create();
  cleanups.push(() => schemaEditor._tiptapEditor.destroy());
  const doc = blocksToYDoc(
    schemaEditor,
    [{ id: "paragraph", type: "paragraph", content: "Initial document" }],
    "doc",
  );
  cleanups.push(() => doc.destroy());
  const fragment = doc.get("doc");
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: { fragment, user: { name: "Test", color: "red" } },
    }),
  );
  cleanups.push(() => editor._tiptapEditor.destroy());

  // Drive the real plugin views through the headless state adapter. Neither
  // synchronization nor history requires DOM rendering for this regression.
  const view = editor.prosemirrorView;
  const getView = vi
    .spyOn(editor._tiptapEditor, "view", "get")
    .mockReturnValue(view);
  cleanups.push(() => getView.mockRestore());
  view.updateState(
    editor.prosemirrorState.reconfigure({
      plugins: editor._tiptapEditor.extensionManager.plugins,
    }),
  );
  const pluginViews: PluginView[] = [];
  const updateState = view.updateState.bind(view);
  const update = vi.spyOn(view, "updateState").mockImplementation((state) => {
    const previous = view.state;
    updateState(state);
    for (const pluginView of pluginViews) {
      pluginView.update?.(view, previous);
    }
  });
  cleanups.push(() => {
    for (const pluginView of pluginViews.reverse()) {
      pluginView.destroy?.();
    }
    update.mockRestore();
  });
  function recreatePluginViews() {
    for (const pluginView of pluginViews.splice(0).reverse()) {
      pluginView.destroy?.();
    }
    for (const plugin of view.state.plugins) {
      if (
        plugin.spec.view &&
        (plugin === ySyncPluginKey.get(view.state) ||
          plugin === yUndoPluginKey.get(view.state))
      ) {
        // Only collaboration's sync/undo views are needed, not UI plugins.
        pluginViews.push(plugin.spec.view(view));
      }
    }
  }
  recreatePluginViews();
  editor.exec(configureYProsemirror({ ytype: fragment }));
  return { editor, schemaEditor, doc, recreatePluginViews };
}

it.each([false, true])(
  "undoes and redoes formatting on an existing collaborative document (recreate plugin views: %s)",
  (recreateViews) => {
    const { editor, schemaEditor, doc, recreatePluginViews } =
      createCollaborativeEditor();
    const initial = editor.document;
    expect(initial[0].content).toEqual([
      { type: "text", text: "Initial document", styles: {} },
    ]);

    editor.transact((tr) => {
      tr.setSelection(
        TextSelection.create(tr.doc, 3, 3 + "Initial document".length),
      );
    });
    editor.addStyles({ bold: true });
    const formatted = editor.document;
    expect(formatted[0].content).toEqual([
      { type: "text", text: "Initial document", styles: { bold: true } },
    ]);
    expect(yDocToBlocks(schemaEditor, doc, "doc")).toEqual(formatted);

    if (recreateViews) {
      recreatePluginViews();
    }
    const undo = editor.getExtension(YUndoExtension)!;
    expect(editor.canExec(undo.undoCommand)).toBe(true);
    expect(editor.canExec(undo.redoCommand)).toBe(false);
    expect(editor.document).toEqual(formatted);
    expect(editor.undo()).toBe(true);
    expect(editor.document).toEqual(initial);
    expect(yDocToBlocks(schemaEditor, doc, "doc")).toEqual(initial);
    expect(editor.undo()).toBe(false);
    expect(editor.canExec(undo.redoCommand)).toBe(true);
    expect(editor.document).toEqual(initial);
    expect(editor.redo()).toBe(true);
    expect(editor.document).toEqual(formatted);
    expect(yDocToBlocks(schemaEditor, doc, "doc")).toEqual(formatted);
    expect(editor.redo()).toBe(false);
  },
);

it("destroys its undo manager when the editor is destroyed, not when plugin views are recreated", () => {
  const { editor, doc, recreatePluginViews } = createCollaborativeEditor();
  const undoManager = yUndoPluginKey.getState(
    editor.prosemirrorState,
  )!.undoManager;
  expect(undoManager.trackedOrigins.has(undoManager)).toBe(true);
  recreatePluginViews();
  expect(undoManager.trackedOrigins.has(undoManager)).toBe(true);
  editor._tiptapEditor.destroy();
  expect(undoManager.trackedOrigins.has(undoManager)).toBe(false);
  expect(doc.isDestroyed).toBe(false);
});
