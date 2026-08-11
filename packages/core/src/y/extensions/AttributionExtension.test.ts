/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { User } from "../../user/index.js";
import { AttributionExtension } from "./AttributionExtension.js";

// Editors created during a test, destroyed in afterEach: an undestroyed
// EditorView leaves ProseMirror DOMObserver timers behind, which fire after
// the jsdom environment is torn down ("document is not defined" as an
// unhandled error - flaky, timing-dependent, mostly on slow CI).
const editors: BlockNoteEditor[] = [];

// A `resolveUsers` spy plus an editor with the AttributionExtension registered.
// No Yjs/collaboration needed — the extension's load plugin only cares that a
// transaction adds a `y-attributed-*` mark, which we do directly below.
function createEditor() {
  const resolveUsers = vi.fn(
    async (ids: string[]): Promise<User[]> =>
      ids.map((id) => ({
        id,
        username: `name-${id}`,
        avatarUrl: "",
        color: "#123456",
        colorLight: "#abcdef",
      })),
  );

  const editor = BlockNoteEditor.create({
    extensions: [AttributionExtension({ resolveUsers })],
  });
  editor.mount(document.createElement("div"));
  editors.push(editor);

  return { editor, resolveUsers };
}

// Add a `y-attributed-insert` mark carrying `userIds` over the first block's
// text, mirroring how the sync reconcile applies attribution marks.
function addInsertMark(editor: BlockNoteEditor, userIds: string[]) {
  const markType = editor.pmSchema.marks["y-attributed-insert"];
  editor.transact((tr) => {
    tr.doc.descendants((node, pos) => {
      if (node.isText) {
        tr.addMark(pos, pos + node.nodeSize, markType.create({ userIds }));
        return false;
      }
      return true;
    });
  });
}

describe("AttributionExtension user loading", () => {
  afterEach(() => {
    for (const editor of editors.splice(0)) {
      editor._tiptapEditor.destroy();
    }
    vi.restoreAllMocks();
  });

  it("loads the authors when an attribution mark is added by a change", () => {
    const { editor, resolveUsers } = createEditor();
    editor.replaceBlocks(editor.document, [{ content: "hello" }]);
    resolveUsers.mockClear();

    addInsertMark(editor, ["alice"]);

    expect(resolveUsers).toHaveBeenCalledTimes(1);
    // The extension's user store passes itself as the resolver's second arg.
    expect(resolveUsers).toHaveBeenCalledWith(["alice"], expect.anything());
  });

  it("does not load users for changes without attribution marks", () => {
    const { editor, resolveUsers } = createEditor();
    editor.replaceBlocks(editor.document, [{ content: "hello" }]);
    resolveUsers.mockClear();

    editor.replaceBlocks(editor.document, [{ content: "hello world" }]);

    expect(resolveUsers).not.toHaveBeenCalled();
  });

  it("only requests each uncached author once across changes", () => {
    const { editor, resolveUsers } = createEditor();
    editor.replaceBlocks(editor.document, [{ content: "hello" }]);
    resolveUsers.mockClear();

    addInsertMark(editor, ["alice"]);
    addInsertMark(editor, ["alice"]);

    // The user store dedupes already-cached ids, so `alice` is fetched once.
    expect(resolveUsers).toHaveBeenCalledTimes(1);
  });
});
