import { afterEach, describe, expect, vi } from "vite-plus/test";

import type { SetupEditor } from "../../../../../tests/src/commands/browser/setupEditor.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { User } from "../../user/index.js";
import { cssVarUserId } from "../../user/index.js";
import { AttributionExtension } from "./AttributionExtension.js";

// A `resolveUsers` spy plus an editor with the AttributionExtension registered.
// No Yjs/collaboration needed — the extension's load plugin only cares that a
// transaction adds a `y-attributed-*` mark, which we do directly below.
async function createEditor(setupEditor: SetupEditor, user?: Partial<User>) {
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

  const { editor } = await setupEditor({
    mountType: "dom",
    extensions: [AttributionExtension({ resolveUsers })],
  });
  return { editor, resolveUsers };
}

/** The `--user-color-<key>-{light,dark}` values on the editor root. */
function rootColorVars(editor: BlockNoteEditor, userId: string) {
  const root = editor.domElement!;
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
    vi.restoreAllMocks();
  });

  it("writes both of a resolved author's colors to the editor root", async ({
    setupEditor,
  }) => {
    const { editor } = await createEditor(setupEditor);
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

  it("derives the light tint for an author that only has a `color`", async ({
    setupEditor,
  }) => {
    const { editor } = await createEditor(setupEditor, {
      colorLight: undefined,
    });
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

  it("loads property authors, replaces stale attribution, and shows the changed keys", async ({
    setupEditor,
  }) => {
    const { editor, resolveUsers } = await createEditor(setupEditor);
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
    expect(editor.transact(({ doc }) => doc.nodeAt(2)!.marks)).toHaveLength(1);
    expect(editor.document).toEqual(originalBlocks);
    const wrapper =
      editor.domElement!.querySelector<HTMLElement>("[data-attributes]")!;
    wrapper.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    expect(
      editor.getExtension(AttributionExtension)!.store.state,
    ).toMatchObject({
      modificationType: "attrs",
      attributes: ["backgroundColor"],
      users: ["name-bob"],
      contentType: "block",
    });
  });

  it("keeps deletion styling directly on the node when attributes are also attributed", async ({
    setupEditor,
  }) => {
    const { editor } = await createEditor(setupEditor);
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
      editor.domElement!.querySelector(
        "[data-attributes] > span > del > .bn-suggestion-node--delete > .bn-block-content",
      ),
    ).not.toBeNull();
  });

  it("only opens a tooltip in the editor containing the hovered mark", async ({
    setupEditor,
  }) => {
    const { editor } = await createEditor(setupEditor);
    const { editor: otherEditor } = await createEditor(setupEditor);
    editor.replaceBlocks(editor.document, [{ content: "hello" }]);
    const mark = editor.pmSchema.marks["y-attributed-attrs"].create({
      changes: { textAlignment: { userIds: [], timestamp: null } },
    });
    editor.transact((tr) => tr.addNodeMark(2, mark));
    editor
      .domElement!.querySelector("[data-attributes]")!
      .dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    expect(
      editor.getExtension(AttributionExtension)!.store.state,
    ).toBeDefined();
    expect(
      otherEditor.getExtension(AttributionExtension)!.store.state,
    ).toBeUndefined();
    otherEditor.domElement!.dispatchEvent(
      new MouseEvent("mouseover", { bubbles: true }),
    );
    expect(
      editor.getExtension(AttributionExtension)!.store.state,
    ).toBeUndefined();
  });

  it("shows changed properties even when a version diff has no author", async ({
    setupEditor,
  }) => {
    const { editor } = await createEditor(setupEditor);
    editor.replaceBlocks(editor.document, [
      { type: "paragraph", content: "hello" },
    ]);
    const mark = editor.pmSchema.marks["y-attributed-attrs"].create({
      changes: { textAlignment: { userIds: [], timestamp: null } },
    });
    editor.transact((tr) => tr.addNodeMark(2, mark));
    const wrapper =
      editor.domElement!.querySelector<HTMLElement>("[data-attributes]")!;
    wrapper.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    expect(
      editor.getExtension(AttributionExtension)!.store.state,
    ).toMatchObject({
      modificationType: "attrs",
      attributes: ["textAlignment"],
      users: [],
    });
  });

  it("does not show a change to a block's id", async ({ setupEditor }) => {
    const { editor } = await createEditor(setupEditor);
    editor.replaceBlocks(editor.document, [
      { type: "paragraph", content: "hello" },
    ]);
    const markType = editor.pmSchema.marks["y-attributed-attrs"];
    const id = { userIds: ["alice"], timestamp: null };
    editor.transact((tr) =>
      tr.addNodeMark(2, markType.create({ changes: { id } })),
    );
    const block = editor.domElement!.querySelector(".bn-block-content")!;
    block.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    expect(editor.domElement!.querySelector("[data-user-ids]")).toBeNull();
    expect(
      editor.getExtension(AttributionExtension)!.store.state,
    ).toBeUndefined();

    editor.transact((tr) =>
      tr.addNodeMark(
        2,
        markType.create({ changes: { id, textAlignment: id } }),
      ),
    );
    editor
      .domElement!.querySelector("[data-attributes]")!
      .dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    expect(
      editor.getExtension(AttributionExtension)!.store.state,
    ).toMatchObject({
      modificationType: "attrs",
      attributes: ["textAlignment"],
    });
  });

  it("names only the authors of the attribute changes it shows", async ({
    setupEditor,
  }) => {
    const { editor } = await createEditor(setupEditor);
    editor.replaceBlocks(editor.document, [
      { type: "paragraph", content: "hello" },
    ]);
    const markType = editor.pmSchema.marks["y-attributed-attrs"];
    editor.transact((tr) =>
      tr.addNodeMark(
        2,
        markType.create({
          changes: {
            id: { userIds: ["bob"], timestamp: null },
            textAlignment: { userIds: ["alice"], timestamp: null },
          },
        }),
      ),
    );
    const mark =
      editor.domElement!.querySelector<HTMLElement>("[data-attributes]")!;
    expect(JSON.parse(mark.dataset["userIds"]!)).toEqual(["alice"]);
    mark.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    expect(
      editor.getExtension(AttributionExtension)!.store.state,
    ).toMatchObject({ attributes: ["textAlignment"], users: ["alice"] });
  });
});
