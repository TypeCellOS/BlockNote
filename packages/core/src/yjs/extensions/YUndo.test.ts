import { closeHistory } from "@tiptap/pm/history";
import { Plugin, TextSelection } from "prosemirror-state";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { yUndoPluginKey } from "y-prosemirror";
import * as Y from "yjs";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { withCollaboration } from "../index.js";
import { YUndoExtension } from "./YUndo.js";

describe("YUndo history boundaries", () => {
  let doc: Y.Doc;
  let editor: BlockNoteEditor;
  let undoManager: Y.UndoManager;

  beforeEach(() => {
    doc = new Y.Doc();
    const fragment = doc.getXmlFragment("document");
    editor = BlockNoteEditor.create(
      withCollaboration({
        collaboration: {
          fragment,
          user: { name: "Test", color: "#ff0000" },
          provider: undefined,
        },
      }),
    );
    editor.mount(document.createElement("div"));
    const undoState = yUndoPluginKey.getState(editor.prosemirrorState);
    if (!undoState) {
      throw new Error("Missing Yjs undo plugin in collaborative test editor");
    }
    undoManager = undoState.undoManager;
    undoManager.clear();
    undoManager.stopCapturing();
    // Both edits occur within one capture window, regardless of test speed.
    vi.spyOn(Date, "now").mockReturnValue(Date.now());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    undoManager.destroy();
    editor._tiptapEditor.destroy();
    doc.destroy();
  });

  function insert(value: string) {
    editor.prosemirrorView.dispatch(
      editor.prosemirrorState.tr.insertText(value),
    );
  }

  it("groups consecutive edits without a history boundary", () => {
    insert("first");
    insert("second");

    undoManager.undo();
    expect(editor.prosemirrorState.doc.textContent).toBe("");
    expect(undoManager.canUndo()).toBe(false);
    undoManager.redo();
    expect(editor.prosemirrorState.doc.textContent).toBe("firstsecond");
  });

  it("separates edits across closeHistory for undo and redo", () => {
    insert("first");
    editor.prosemirrorView.dispatch(closeHistory(editor.prosemirrorState.tr));
    insert("second");

    undoManager.undo();
    expect(editor.prosemirrorState.doc.textContent).toBe("first");
    undoManager.undo();
    expect(editor.prosemirrorState.doc.textContent).toBe("");
    expect(undoManager.canUndo()).toBe(false);
    undoManager.redo();
    expect(editor.prosemirrorState.doc.textContent).toBe("first");
    undoManager.redo();
    expect(editor.prosemirrorState.doc.textContent).toBe("firstsecond");
  });
});

describe("YUndo view lifecycle", () => {
  let doc: Y.Doc;
  let editor: BlockNoteEditor;
  let container: HTMLDivElement;

  function manager(): Y.UndoManager {
    const state = yUndoPluginKey.getState(editor.prosemirrorState);
    if (!state) {
      throw new Error("Missing collaborative undo state");
    }
    return state.undoManager;
  }

  function insert(text: string) {
    const end = TextSelection.atEnd(editor.prosemirrorState.doc).from;
    editor.prosemirrorView.dispatch(
      editor.prosemirrorState.tr.insertText(text, end),
    );
  }

  beforeEach(() => {
    doc = new Y.Doc();
    editor = BlockNoteEditor.create(
      withCollaboration({
        collaboration: {
          fragment: doc.getXmlFragment("document"),
          user: { name: "Test", color: "#ff0000" },
          provider: undefined,
        },
      }),
    );
    container = document.createElement("div");
    document.body.append(container);
    editor.mount(container);
    manager().clear();
  });

  afterEach(() => {
    editor._tiptapEditor.destroy();
    doc.destroy();
    container.remove();
    vi.restoreAllMocks();
  });

  it("retains undo and redo through repeated unmount/mount cycles", () => {
    const original = manager();
    insert("before");
    for (let cycle = 0; cycle < 3; cycle++) {
      editor.unmount();
      editor.mount(container);
      expect(manager()).toBe(original);
      expect(editor.undo()).toBe(true);
      expect(editor.prosemirrorState.doc.textContent).toBe("");
      expect(editor.redo()).toBe(true);
      expect(editor.prosemirrorState.doc.textContent).toBe("before");
    }
    original.stopCapturing();
    insert("after");
    expect(editor.undo()).toBe(true);
    expect(editor.prosemirrorState.doc.textContent).toBe("before");
    expect(editor.redo()).toBe(true);
    expect(editor.prosemirrorState.doc.textContent).toBe("beforeafter");
  });

  it("keeps history usable when an unrelated extension recreates plugin views", () => {
    const original = manager();
    insert("before");
    const extension = {
      key: "unrelated",
      prosemirrorPlugins: [new Plugin({})],
    };
    editor.registerExtension(extension);
    expect(manager()).toBe(original);
    expect(editor.undo()).toBe(true);
    expect(editor.redo()).toBe(true);
    editor.replaceExtension(extension, {
      ...extension,
      prosemirrorPlugins: [new Plugin({})],
    });
    expect(manager()).toBe(original);
    expect(editor.undo()).toBe(true);
    expect(editor.redo()).toBe(true);
    editor.unregisterExtension(extension);
    original.stopCapturing();
    insert("after");
    expect(editor.undo()).toBe(true);
    expect(editor.prosemirrorState.doc.textContent).toBe("before");
    expect(editor.redo()).toBe(true);
    expect(editor.prosemirrorState.doc.textContent).toBe("beforeafter");
  });

  it("honors explicit state resets and disposes the replaced manager", () => {
    const original = manager();
    insert("before");
    editor.replaceExtension("yUndo", YUndoExtension(), {
      resetPluginStateFor: [yUndoPluginKey],
    });
    expect(manager()).not.toBe(original);
    expect(original.trackedOrigins.has(original)).toBe(false);
    expect(editor.undo()).toBe(false);
    insert("after");
    expect(original.undoStack).toHaveLength(1);
    expect(editor.undo()).toBe(true);
    expect(editor.prosemirrorState.doc.textContent).toBe("before");
    expect(editor.redo()).toBe(true);
    expect(editor.prosemirrorState.doc.textContent).toBe("beforeafter");
  });

  it("restores document-destroy cleanup on remount", () => {
    editor.unmount();
    const current = manager();
    const destroy = vi.spyOn(current, "destroy");
    editor.mount(container);
    destroy.mockClear();
    doc.destroy();
    expect(destroy).toHaveBeenCalledOnce();
    expect(current.trackedOrigins.has(current)).toBe(false);
  });

  it("removes document listeners on unmount", () => {
    const current = manager();
    const off = vi.spyOn(doc, "off");
    editor.unmount();
    expect(current.trackedOrigins.has(current)).toBe(false);
    expect(off).toHaveBeenCalledWith(
      "afterTransaction",
      current.afterTransactionHandler,
    );
    expect(off).toHaveBeenCalledWith("destroy", expect.any(Function));
  });
});
