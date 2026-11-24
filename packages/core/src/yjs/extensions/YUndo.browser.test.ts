import { closeHistory } from "@tiptap/pm/history";
import { Plugin } from "prosemirror-state";
import {
  afterEach,
  describe,
  expect,
  type TestContext,
  vi,
} from "vite-plus/test";
import { yUndoPluginKey } from "y-prosemirror";
import * as Y from "yjs";

import type { SetupEditor } from "../../../../../tests/src/commands/browser/setupEditor.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { withCollaboration } from "../index.js";
import { YUndoExtension } from "./YUndo.js";

async function mountCollaborativeEditor(
  setupEditor: SetupEditor,
  onTestFinished: TestContext["onTestFinished"],
) {
  const doc = new Y.Doc();
  onTestFinished(() => doc.destroy());
  const { editor } = await setupEditor({
    mountType: "dom",
    ...withCollaboration({
      extensions: [],
      collaboration: {
        fragment: doc.getXmlFragment("document"),
        user: { name: "Test", color: "#ff0000" },
        provider: undefined,
      },
    }),
  });
  return { editor, doc, container: editor.domElement! };
}

describe("YUndo history boundaries", () => {
  let editor: BlockNoteEditor;
  let undoManager: Y.UndoManager;

  async function setup(
    setupEditor: SetupEditor,
    onTestFinished: TestContext["onTestFinished"],
  ) {
    ({ editor } = await mountCollaborativeEditor(setupEditor, onTestFinished));
    const undoState = yUndoPluginKey.getState(editor.prosemirrorState);
    if (!undoState) {
      throw new Error("Missing Yjs undo plugin in collaborative test editor");
    }
    undoManager = undoState.undoManager;
    undoManager.clear();
    undoManager.stopCapturing();
    // Both edits occur within one capture window, regardless of test speed.
    vi.spyOn(Date, "now").mockReturnValue(Date.now());
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function insert(value: string) {
    editor.insertInlineContent(value, { updateSelection: true });
  }

  it("groups consecutive edits without a history boundary", async ({
    setupEditor,
    onTestFinished,
  }) => {
    await setup(setupEditor, onTestFinished);
    insert("first");
    insert("second");

    undoManager.undo();
    expect(editor.domElement!.textContent).toBe("");
    expect(undoManager.canUndo()).toBe(false);
    undoManager.redo();
    expect(editor.domElement!.textContent).toBe("firstsecond");
  });

  it("separates edits across closeHistory for undo and redo", async ({
    setupEditor,
    onTestFinished,
  }) => {
    await setup(setupEditor, onTestFinished);
    insert("first");
    editor.transact(closeHistory);
    insert("second");

    undoManager.undo();
    expect(editor.domElement!.textContent).toBe("first");
    undoManager.undo();
    expect(editor.domElement!.textContent).toBe("");
    expect(undoManager.canUndo()).toBe(false);
    undoManager.redo();
    expect(editor.domElement!.textContent).toBe("first");
    undoManager.redo();
    expect(editor.domElement!.textContent).toBe("firstsecond");
  });
});

describe("YUndo view lifecycle", () => {
  let doc: Y.Doc;
  let editor: BlockNoteEditor;
  let container: HTMLElement;

  function manager(): Y.UndoManager {
    const state = yUndoPluginKey.getState(editor.prosemirrorState);
    if (!state) {
      throw new Error("Missing collaborative undo state");
    }
    return state.undoManager;
  }

  function insert(text: string) {
    editor.setTextCursorPosition(editor.document.at(-1)!, "end");
    editor.insertInlineContent(text);
  }

  async function setup(
    setupEditor: SetupEditor,
    onTestFinished: TestContext["onTestFinished"],
  ) {
    ({ editor, doc, container } = await mountCollaborativeEditor(
      setupEditor,
      onTestFinished,
    ));
    manager().clear();
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retains undo and redo through repeated unmount/mount cycles", async ({
    setupEditor,
    onTestFinished,
  }) => {
    await setup(setupEditor, onTestFinished);
    const original = manager();
    insert("before");
    for (let cycle = 0; cycle < 3; cycle++) {
      editor.unmount();
      editor.mount(container);
      expect(manager()).toBe(original);
      expect(editor.undo()).toBe(true);
      expect(editor.domElement!.textContent).toBe("");
      expect(editor.redo()).toBe(true);
      expect(editor.domElement!.textContent).toBe("before");
    }
    original.stopCapturing();
    insert("after");
    expect(editor.undo()).toBe(true);
    expect(editor.domElement!.textContent).toBe("before");
    expect(editor.redo()).toBe(true);
    expect(editor.domElement!.textContent).toBe("beforeafter");
  });

  it("keeps history usable when an unrelated extension recreates plugin views", async ({
    setupEditor,
    onTestFinished,
  }) => {
    await setup(setupEditor, onTestFinished);
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
    expect(editor.domElement!.textContent).toBe("before");
    expect(editor.redo()).toBe(true);
    expect(editor.domElement!.textContent).toBe("beforeafter");
  });

  it("honors explicit state resets and disposes the replaced manager", async ({
    setupEditor,
    onTestFinished,
  }) => {
    await setup(setupEditor, onTestFinished);
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
    expect(editor.domElement!.textContent).toBe("before");
    expect(editor.redo()).toBe(true);
    expect(editor.domElement!.textContent).toBe("beforeafter");
  });

  it("restores document-destroy cleanup on remount", async ({
    setupEditor,
    onTestFinished,
  }) => {
    await setup(setupEditor, onTestFinished);
    editor.unmount();
    const current = manager();
    const destroy = vi.spyOn(current, "destroy");
    editor.mount(container);
    destroy.mockClear();
    doc.destroy();
    expect(destroy).toHaveBeenCalledOnce();
    expect(current.trackedOrigins.has(current)).toBe(false);
  });

  it("removes document listeners on unmount", async ({
    setupEditor,
    onTestFinished,
  }) => {
    await setup(setupEditor, onTestFinished);
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
