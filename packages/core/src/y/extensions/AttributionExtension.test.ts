/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { User } from "../../user/index.js";
import { cssVarUserId } from "../../user/index.js";
import { AttributionExtension } from "./AttributionExtension.js";

// Editors created during a test, destroyed in afterEach: an undestroyed
// EditorView leaves ProseMirror DOMObserver timers behind, which fire after
// the jsdom environment is torn down ("document is not defined" as an
// unhandled error - flaky, timing-dependent, mostly on slow CI).
const editors: BlockNoteEditor[] = [];
const mounts: HTMLElement[] = [];

// A `resolveUsers` spy plus an editor with the AttributionExtension registered.
// No Yjs/collaboration needed — the extension's load plugin only cares that a
// transaction adds a `y-attributed-*` mark, which we do directly below.
function createEditor(user?: Partial<User>) {
  const resolveUsers = vi.fn(async (ids: string[]): Promise<User[]> =>
    ids.map((id) => ({
      id,
      username: `name-${id}`,
      avatarUrl: "",
      color: "#123456",
      colorLight: "#abcdef",
      ...user,
    })),
  );

  const editor = BlockNoteEditor.create({
    extensions: [AttributionExtension({ resolveUsers })],
  });
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  mounts.push(mount);
  editor.mount(mount);
  editors.push(editor);

  return { editor, resolveUsers };
}

/** The `--user-color-<key>-{light,dark}` values on the editor root. */
function rootColorVars(editor: BlockNoteEditor, userId: string) {
  const root = editor.prosemirrorView!.dom as HTMLElement;
  const key = cssVarUserId(userId);
  return {
    light: root.style.getPropertyValue(`--user-color-${key}-light`),
    dark: root.style.getPropertyValue(`--user-color-${key}-dark`),
  };
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
    for (const mount of mounts.splice(0)) {
      mount.remove();
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

  it("replaces attribution authors while allowing different attribution kinds to coexist", () => {
    const { editor } = createEditor();
    editor.replaceBlocks(editor.document, [{ content: "hello" }]);
    const names = [
      "y-attributed-insert",
      "y-attributed-delete",
      "y-attributed-format",
    ];
    for (const author of ["alice", "bob"]) {
      editor.transact((tr) => {
        tr.doc.descendants((node, pos) => {
          if (node.isText) {
            for (const name of names) {
              tr.addMark(
                pos,
                pos + node.nodeSize,
                editor.pmSchema.marks[name].create({
                  userIds: [author],
                  ...(name === "y-attributed-format"
                    ? { format: { bold: [author] } }
                    : {}),
                }),
              );
            }
          }
        });
      });
    }
    editor.prosemirrorState.doc.descendants((node) => {
      if (node.isText) {
        expect(node.marks).toHaveLength(3);
        expect(node.marks.map((mark) => mark.type.name).sort()).toEqual(
          [...names].sort(),
        );
        for (const mark of node.marks) {
          expect(mark.attrs.userIds).toEqual(["bob"]);
        }
        expect(
          node.marks.find((mark) => mark.type.name === "y-attributed-format")!
            .attrs.format,
        ).toEqual({ bold: ["bob"] });
      }
    });
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

  it("writes both of a resolved author's colors to the editor root", async () => {
    const { editor } = createEditor();
    editor.replaceBlocks(editor.document, [{ content: "hello" }]);

    addInsertMark(editor, ["alice"]);
    await vi.waitFor(() =>
      expect(rootColorVars(editor, "alice").dark).not.toBe(""),
    );

    expect(rootColorVars(editor, "alice")).toEqual({
      light: "#abcdef",
      dark: "#123456",
    });
  });

  it("derives the light tint for an author that only has a `color`", async () => {
    const { editor } = createEditor({ colorLight: undefined });
    editor.replaceBlocks(editor.document, [{ content: "hello" }]);

    addInsertMark(editor, ["alice"]);
    await vi.waitFor(() =>
      expect(rootColorVars(editor, "alice").dark).not.toBe(""),
    );

    expect(rootColorVars(editor, "alice")).toEqual({
      light: "color-mix(in srgb, #123456 30%, white)",
      dark: "#123456",
    });
  });

  it("loads property authors, replaces stale attribution, and shows the changed keys", async () => {
    const { editor, resolveUsers } = createEditor();
    editor.replaceBlocks(editor.document, [
      { type: "paragraph", content: "hello" },
    ]);
    const originalBlocks = editor.document;
    const markType = editor.pmSchema.marks["y-attributed-attrs"];
    function setChanges(
      changes: Record<string, { userIds: string[]; timestamp: null }>,
    ) {
      editor.transact((tr) => tr.addNodeMark(2, markType.create({ changes })));
    }
    setChanges({ textAlignment: { userIds: ["alice"], timestamp: null } });
    await vi.waitFor(() =>
      expect(rootColorVars(editor, "alice").dark).toBe("#123456"),
    );
    expect(resolveUsers).toHaveBeenCalledWith(["alice"], expect.anything());
    setChanges({ backgroundColor: { userIds: ["bob"], timestamp: null } });
    await vi.waitFor(() =>
      expect(rootColorVars(editor, "bob").dark).toBe("#123456"),
    );
    expect(editor.prosemirrorState.doc.nodeAt(2)!.marks).toHaveLength(1);
    expect(editor.document).toEqual(originalBlocks);
    const wrapper =
      editor.prosemirrorView.dom.querySelector<HTMLElement>(
        "[data-attributes]",
      )!;
    wrapper.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    expect(
      editor.getExtension(AttributionExtension)!.store.state,
    ).toMatchObject({
      modificationType: "attrs",
      attributes: ["backgroundColor"],
      users: ["name-bob"],
      contentType: "block",
      provenance: "author",
    });
  });

  it("keeps deletion styling directly on the node when attributes are also attributed", () => {
    const { editor } = createEditor();
    editor.replaceBlocks(editor.document, [{ content: "hello" }]);
    editor.transact((tr) => {
      tr.addNodeMark(
        2,
        editor.pmSchema.marks["y-attributed-delete"].create({
          userIds: ["alice"],
        }),
      );
      tr.addNodeMark(
        2,
        editor.pmSchema.marks["y-attributed-attrs"].create({
          changes: { textAlignment: { userIds: ["alice"], timestamp: null } },
        }),
      );
    });
    expect(
      editor.prosemirrorView.dom.querySelector(
        "[data-attributes] > span > del > .bn-suggestion-node--delete > .bn-block-content",
      ),
    ).not.toBeNull();
  });

  it("only opens a tooltip in the editor containing the hovered mark", () => {
    const { editor } = createEditor();
    const { editor: otherEditor } = createEditor();
    editor.replaceBlocks(editor.document, [{ content: "hello" }]);
    const mark = editor.pmSchema.marks["y-attributed-attrs"].create({
      changes: { textAlignment: { userIds: [], timestamp: null } },
    });
    editor.transact((tr) => tr.addNodeMark(2, mark));
    editor.prosemirrorView.dom
      .querySelector("[data-attributes]")!
      .dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    expect(
      editor.getExtension(AttributionExtension)!.store.state,
    ).toBeDefined();
    expect(
      otherEditor.getExtension(AttributionExtension)!.store.state,
    ).toBeUndefined();
    otherEditor.prosemirrorView.dom.dispatchEvent(
      new MouseEvent("mouseover", { bubbles: true }),
    );
    expect(
      editor.getExtension(AttributionExtension)!.store.state,
    ).toBeUndefined();
  });

  it("shows changed properties even when a version diff has no author", () => {
    const { editor } = createEditor();
    editor.replaceBlocks(editor.document, [
      { type: "paragraph", content: "hello" },
    ]);
    const mark = editor.pmSchema.marks["y-attributed-attrs"].create({
      changes: { textAlignment: { userIds: [], timestamp: null } },
    });
    editor.transact((tr) => tr.addNodeMark(2, mark));
    const wrapper =
      editor.prosemirrorView.dom.querySelector<HTMLElement>(
        "[data-attributes]",
      )!;
    wrapper.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    expect(
      editor.getExtension(AttributionExtension)!.store.state,
    ).toMatchObject({
      modificationType: "attrs",
      attributes: ["textAlignment"],
      users: [],
    });
  });
});
