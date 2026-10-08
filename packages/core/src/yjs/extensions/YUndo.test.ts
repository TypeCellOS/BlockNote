import { closeHistory } from "@tiptap/pm/history";
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
