import * as Y from "@y/y";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import { describe, expect, onTestFinished } from "vite-plus/test";

import type { CommandContext } from "../../../../../tests/src/commands/index.js";
import type { SetupEditor } from "../../../../../tests/src/commands/browser/setupEditor.js";
import { CommentMark } from "../../comments/mark.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { PartialBlock } from "../../blocks/defaultBlocks.js";
import { createExtension } from "../../editor/BlockNoteExtension.js";
import { blocksToYType } from "../utils.js";
import { AttributionExtension } from "./AttributionExtension.js";
import { withCollaboration } from "./index.js";
import { createYVersionView } from "./Versioning.js";

// Vitest unwinds finish hooks in reverse registration order: close the
// preview, dispose its mounted editor and host, then destroy its backing doc.
function ownedDoc(options?: ConstructorParameters<typeof Y.Doc>[0]) {
  const doc = new Y.Doc(options);
  onTestFinished(() => doc.destroy());
  return doc;
}

function openPreview(editor: BlockNoteEditor, doc: Y.Doc) {
  const view = createYVersionView(editor, doc.get("doc")).open();
  onTestFinished(() => view.close());
  return view;
}

async function collaborativeEditor(setupEditor: SetupEditor, doc: Y.Doc) {
  const { editor } = await setupEditor({
    mountType: "dom",
    ...withCollaboration({
      extensions: [],
      collaboration: {
        fragment: doc.get("doc"),
        user: { name: "Test", color: "#ff0000" },
      },
    }),
  });
  return editor;
}

async function baseDocument(
  setupEditor: CommandContext["setupEditor"],
  blocks: PartialBlock[],
) {
  const doc = ownedDoc({ gc: false });
  doc.clientID = 100;
  const { editor: seed } = await setupEditor({
    mountType: false,
    initialContent: blocks,
  });
  blocksToYType(seed, seed.document, doc.get("doc"));
  return doc;
}

/**
 * One user's edit of `base`, as the updates their client sends. Unlike a state
 * update, these delete only what the user deleted.
 */
async function editOf(
  setupEditor: SetupEditor,
  base: Y.Doc,
  client: number,
  edit: (editor: BlockNoteEditor) => void,
) {
  const doc = ownedDoc({ gc: false });
  doc.clientID = client;
  Y.applyUpdateV2(doc, Y.encodeStateAsUpdateV2(base));
  const editor = await collaborativeEditor(setupEditor, doc);
  const updates: Uint8Array<ArrayBuffer>[] = [];
  function collectUpdate(update: Uint8Array<ArrayBuffer>) {
    updates.push(update);
  }
  doc.on("updateV2", collectUpdate);
  try {
    edit(editor);
  } finally {
    doc.off("updateV2", collectUpdate);
  }
  return Y.mergeUpdatesV2(updates);
}

/**
 * Attribute deletions the way YHub does: only what the update itself deletes,
 * not content removed along with a deleted parent.
 */
function deletedBy(update: Uint8Array, user: string) {
  const attributions = Y.createContentMap();
  Y.insertIntoIdMap(
    attributions.deletes,
    Y.createIdMapFromIdSet(Y.decodeUpdateV2(update).ds, [
      Y.createContentAttribute("delete", user),
    ]),
  );
  return attributions;
}

/**
 * A server applying users' updates in turn, attributing each the way YHub
 * does: what the update inserts, and what it explicitly deletes, each with a
 * time.
 */
function history(base: Y.Doc) {
  const server = ownedDoc({ gc: false });
  Y.applyUpdateV2(server, Y.encodeStateAsUpdateV2(base));
  const attributions = Y.createContentMap();
  let time = 0;
  return {
    server,
    attributions,
    apply(update: Uint8Array, user: string) {
      time += 1000;
      const before = Y.createInsertSetFromStructStore(server.store, false);
      Y.applyUpdateV2(server, update);
      const inserted = Y.diffIdSet(
        Y.createInsertSetFromStructStore(server.store, false),
        before,
      );
      Y.insertIntoIdMap(
        attributions.inserts,
        Y.createIdMapFromIdSet(inserted, [
          Y.createContentAttribute("insert", user),
          Y.createContentAttribute("insertAt", time),
        ]),
      );
      Y.insertIntoIdMap(
        attributions.deletes,
        Y.createIdMapFromIdSet(Y.decodeUpdateV2(update).ds, [
          Y.createContentAttribute("delete", user),
          Y.createContentAttribute("deleteAt", time),
        ]),
      );
      return Y.encodeStateAsUpdateV2(server);
    },
  };
}

async function openDiff(setupEditor: SetupEditor, after: Uint8Array) {
  const doc = ownedDoc();
  Y.applyUpdateV2(doc, after);
  const editor = await collaborativeEditor(setupEditor, doc);
  const view = openPreview(editor, doc);
  return {
    editor,
    view,
    show(this: void, before: Uint8Array, attributions?: Y.ContentMap) {
      view.show({
        content: after,
        comparison: { content: before, attributions },
        target: { type: "snapshot", id: "after" },
      });
    },
  };
}

/** Show `after` compared to `before` and return each changed block and text. */
async function showDiff(
  setupEditor: SetupEditor,
  before: Uint8Array,
  after: Uint8Array,
  attributions?: Y.ContentMap,
) {
  const { editor, show } = await openDiff(setupEditor, after);
  show(before, attributions);
  const changes: Array<{ text: string; mark: string; users: string[] }> = [];
  editor.transact(({ doc }) =>
    doc.descendants((node) => {
      const mark = node.marks.find((mark) =>
        ["y-attributed-insert", "y-attributed-delete"].includes(mark.type.name),
      );
      if (mark && (node.isText || node.type.name === "blockContainer")) {
        changes.push({
          text: node.isText ? node.text! : `[block ${node.attrs.id}]`,
          mark: mark.type.name,
          users: mark.attrs["userIds"],
        });
      }
      return true;
    }),
  );
  return { editor, changes };
}

describe("version diff of a deleted block", () => {
  // Known limitation: the parent's deletion mark also covers concurrent descendants.
  // https://github.com/TypeCellOS/BlockNote/pull/3166
  it("currently does not mark text or a child added concurrently as separate deletions", async ({
    setupEditor,
  }) => {
    const base = await baseDocument(setupEditor, [
      {
        id: "parent",
        type: "paragraph",
        content: "Parent",
        children: [{ id: "child", type: "paragraph", content: "Child" }],
      },
      { id: "next", type: "paragraph", content: "Next" },
    ]);
    // Bob adds text and a block inside the parent; Alice, who never receives
    // them, deletes the parent.
    const bob = await editOf(setupEditor, base, 2, (editor) => {
      editor.setTextCursorPosition("child", "end");
      editor.insertInlineContent(" by Bob");
      editor.insertBlocks(
        [{ id: "bobs", type: "paragraph", content: "Bob's block" }],
        "child",
        "after",
      );
    });
    const alice = await editOf(setupEditor, base, 1, (editor) =>
      editor.removeBlocks(["parent"]),
    );

    const server = ownedDoc({ gc: false });
    Y.applyUpdateV2(server, Y.encodeStateAsUpdateV2(base));
    Y.applyUpdateV2(server, bob);
    const withBob = Y.encodeStateAsUpdateV2(server);
    Y.applyUpdateV2(server, alice);

    const { editor, changes } = await showDiff(
      setupEditor,
      withBob,
      Y.encodeStateAsUpdateV2(server),
      deletedBy(alice, "alice"),
    );
    expect(editor.domElement!.textContent).toContain("Child by Bob");
    expect(editor.domElement!.textContent).toContain("Bob's block");
    expect(changes).toEqual([
      {
        text: "[block parent]",
        mark: "y-attributed-delete",
        users: ["alice"],
      },
    ]);
  });

  // Known limitation: the tooltip credits the block's deleter for unseen text.
  // https://github.com/TypeCellOS/BlockNote/pull/3166
  it("currently credits the block's deleter when hovering concurrently added text", async ({
    setupEditor,
  }) => {
    const base = await baseDocument(setupEditor, [
      { id: "parent", type: "paragraph", content: "Parent" },
      { id: "next", type: "paragraph", content: "Next" },
    ]);
    const bob = await editOf(setupEditor, base, 2, (editor) => {
      editor.setTextCursorPosition("parent", "end");
      editor.insertInlineContent(" by Bob");
    });
    const alice = await editOf(setupEditor, base, 1, (editor) =>
      editor.removeBlocks(["parent"]),
    );
    const server = ownedDoc({ gc: false });
    Y.applyUpdateV2(server, Y.encodeStateAsUpdateV2(base));
    Y.applyUpdateV2(server, bob);
    const withBob = Y.encodeStateAsUpdateV2(server);
    Y.applyUpdateV2(server, alice);

    const { editor } = await showDiff(
      setupEditor,
      withBob,
      Y.encodeStateAsUpdateV2(server),
      deletedBy(alice, "alice"),
    );
    const hover = (text: string) => {
      const dom = editor.domElement!;
      const attribution = editor.getExtension(AttributionExtension)!;
      dom.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      expect(attribution.store.state).toBeUndefined();
      const walker = document.createTreeWalker(dom, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.textContent?.includes(text) && node.parentElement) {
          const target = node.parentElement;
          target.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
          const tooltip = attribution.store.state;
          expect(tooltip?.anchor.contains(target)).toBe(true);
          return tooltip;
        }
      }
      throw new Error(`No rendered diff text matching ${JSON.stringify(text)}`);
    };

    expect(hover("Parent")).toMatchObject({
      modificationType: "delete",
      users: ["alice"],
    });
    expect(hover(" by Bob")).toMatchObject({
      modificationType: "delete",
      users: ["alice"],
    });
  });

  it("does not show content inserted and deleted between the two versions", async ({
    setupEditor,
  }) => {
    const doc = ownedDoc({ gc: false });
    const editor = await collaborativeEditor(setupEditor, doc);
    editor.replaceBlocks(editor.document, [
      { id: "a", type: "paragraph", content: "Hello" },
      { id: "b", type: "paragraph", content: "World" },
    ]);
    const before = Y.encodeStateAsUpdateV2(doc);
    editor.setTextCursorPosition("a", "end");
    editor.insertInlineContent(" typo");
    editor.insertBlocks(
      [{ id: "temp", type: "paragraph", content: "Temporary" }],
      "a",
      "after",
    );
    editor.removeBlocks(["temp"]);
    editor.updateBlock("a", { content: "Hello" });
    editor.setTextCursorPosition("b", "end");
    editor.insertInlineContent(" kept");

    const { changes } = await showDiff(
      setupEditor,
      before,
      Y.encodeStateAsUpdateV2(doc),
    );
    expect(changes).toEqual([
      { text: " kept", mark: "y-attributed-insert", users: [] },
    ]);
  });
});

describe("version diff of a moved block", () => {
  const blocks = (setupEditor: CommandContext["setupEditor"]) =>
    baseDocument(setupEditor, [
      {
        id: "parent",
        type: "paragraph",
        content: "Parent",
        children: [{ id: "child", type: "paragraph", content: "Child" }],
      },
      { id: "moved", type: "paragraph", content: "Moved" },
      // Keeps the document from emptying, which shows a placeholder block.
      { id: "next", type: "paragraph", content: "Next" },
    ]);
  // Moves the block into the parent: deletes it and inserts a copy there.
  function nest(editor: BlockNoteEditor) {
    editor.setTextCursorPosition("moved");
    editor.nestBlock();
  }
  function removeParent(editor: BlockNoteEditor) {
    editor.removeBlocks(["parent"]);
  }
  async function deletions(
    setupEditor: SetupEditor,
    before: Uint8Array,
    after: Uint8Array,
    attributions: Y.ContentMap,
  ) {
    const { changes } = await showDiff(
      setupEditor,
      before,
      after,
      attributions,
    );
    return changes
      .filter((change) => change.mark === "y-attributed-delete")
      .map((change) => `${change.text}: ${change.users.join(", ")}`);
  }

  it("attributes a move to the mover", async ({ setupEditor }) => {
    const base = await blocks(setupEditor);
    const server = history(base);
    const after = server.apply(await editOf(setupEditor, base, 2, nest), "bob");
    expect(
      await deletions(
        setupEditor,
        Y.encodeStateAsUpdateV2(base),
        after,
        server.attributions,
      ),
    ).toEqual(["[block moved]: bob"]);
  });

  // Known limitation: content removed with a deleted block is credited to the user who deleted or moved the block. #3166 has a hacky prototype fix.
  it.fails("names no author for a block moved into a concurrently deleted one", async ({
    setupEditor,
  }) => {
    const base = await blocks(setupEditor);
    const bob = await editOf(setupEditor, base, 2, nest);
    const alice = await editOf(setupEditor, base, 1, removeParent);
    const server = history(base);
    const before = server.apply(alice, "alice");
    const after = server.apply(bob, "bob");
    expect(
      await deletions(setupEditor, before, after, server.attributions),
    ).toEqual(["[block moved]: "]);
  });

  it("credits a child to its parent's deleter when its concurrent type change is lost", async ({
    setupEditor,
  }) => {
    const base = await blocks(setupEditor);
    // Bob's type change replaces the child with a heading copy, which Alice's
    // deletion of the parent takes with it.
    const bob = await editOf(setupEditor, base, 2, (editor) =>
      editor.updateBlock("child", { type: "heading" }),
    );
    const alice = await editOf(setupEditor, base, 1, removeParent);
    const server = history(base);
    server.apply(alice, "alice");
    const after = server.apply(bob, "bob");
    expect(
      await deletions(
        setupEditor,
        Y.encodeStateAsUpdateV2(base),
        after,
        server.attributions,
      ),
    ).toEqual(["[block parent]: alice"]);
  });

  // Known limitation: content removed with a deleted block is credited to the user who deleted or moved the block. #3166 has a hacky prototype fix.
  it.fails("names no author for a moved block that someone else deletes", async ({
    setupEditor,
  }) => {
    const base = await blocks(setupEditor);
    const server = history(base);
    server.apply(await editOf(setupEditor, base, 1, nest), "alice");
    const after = server.apply(
      await editOf(setupEditor, server.server, 2, removeParent),
      "bob",
    );
    expect(
      await deletions(
        setupEditor,
        Y.encodeStateAsUpdateV2(base),
        after,
        server.attributions,
      ),
    ).toEqual(["[block parent]: bob", "[block moved]: "]);
  });

  // To be fixed by #3168.
  it.fails.for([
    {
      first: "Bob",
      expected: ["[block n1]: alice", "N1: alice", "[block n2]: ", "N2: "],
    },
    { first: "Alice", expected: ["[block n2]: ", "N2: "] },
  ] as const)(
    "blames no one for a block lost to cascading indents ($first's saved first)",
    async ({ first, expected }, { setupEditor }) => {
      const base = await baseDocument(setupEditor, [
        { id: "n0", type: "paragraph", content: "N0" },
        { id: "n1", type: "paragraph", content: "N1" },
        { id: "n2", type: "paragraph", content: "N2" },
      ]);
      // Alice indents N1 under N0; Bob indents N2 under the N1 that Alice's
      // indent deletes (moving it under N0), so Bob's N2 is lost with it.
      const alice = await editOf(setupEditor, base, 1, (editor) => {
        editor.setTextCursorPosition("n1");
        editor.nestBlock();
      });
      const bob = await editOf(setupEditor, base, 2, (editor) => {
        editor.setTextCursorPosition("n2");
        editor.nestBlock();
      });
      const server = history(base);
      const before =
        first === "Bob"
          ? server.apply(bob, "bob")
          : server.apply(alice, "alice");
      const after =
        first === "Bob"
          ? server.apply(alice, "alice")
          : server.apply(bob, "bob");
      expect(
        await deletions(setupEditor, before, after, server.attributions),
      ).toEqual(expected);
    },
  );
});

describe("version diff of a type change", () => {
  const blocks = (setupEditor: CommandContext["setupEditor"]) =>
    baseDocument(setupEditor, [
      {
        id: "parent",
        type: "paragraph",
        content: "Parent text",
        children: [{ id: "child", type: "paragraph", content: "Child text" }],
      },
      { id: "next", type: "paragraph", content: "Next" },
    ]);
  function toHeading(editor: BlockNoteEditor) {
    editor.updateBlock("parent", { type: "heading" });
  }
  /** Changes as `kind text: users`, attribute changes as `attrs <node>: users`. */
  async function diff(
    setupEditor: SetupEditor,
    before: Uint8Array,
    after: Uint8Array,
    map: Y.ContentMap,
  ) {
    const { editor } = await showDiff(setupEditor, before, after, map);
    const out: string[] = [];
    editor.transact(({ doc }) =>
      doc.descendants((node) => {
        const replaced = node.marks.some((mark) =>
          ["y-attributed-insert", "y-attributed-delete"].includes(
            mark.type.name,
          ),
        );
        for (const mark of node.marks) {
          if (mark.type.name === "y-attributed-attrs" && !replaced) {
            const users = new Set(
              Object.values(
                mark.attrs["changes"] as Record<string, { userIds: string[] }>,
              ).flatMap((change) => change.userIds),
            );
            out.push(`attrs <${node.type.name}>: ${[...users].join(", ")}`);
          } else if (
            mark.type.name === "y-attributed-insert" ||
            mark.type.name === "y-attributed-delete"
          ) {
            const what = node.isText ? node.text : `<${node.type.name}>`;
            const kind = !mark.attrs["moved"]
              ? mark.type.name.slice(13)
              : mark.type.name === "y-attributed-delete"
                ? "moved from"
                : "moved";
            out.push(`${kind} ${what}: ${mark.attrs["userIds"].join(", ")}`);
          }
        }
        return true;
      }),
    );
    return out;
  }

  // Known limitation: a type change or a move re-creates the block, so the diff shows it deleted and inserted again. #3166 has a hacky prototype fix.
  it.fails("shows a type change as a formatting change, not as replaced text", async ({
    setupEditor,
  }) => {
    const base = await blocks(setupEditor);
    const server = history(base);
    const after = server.apply(
      await editOf(setupEditor, base, 2, toHeading),
      "bob",
    );
    expect(
      await diff(
        setupEditor,
        Y.encodeStateAsUpdateV2(base),
        after,
        server.attributions,
      ),
    ).toEqual(["attrs <heading>: bob"]);
  });

  // Known limitation: a type change or a move re-creates the block, so the diff shows it deleted and inserted again. #3166 has a hacky prototype fix.
  it.fails("credits a type-changed block's text to its writer, from before it existed", async ({
    setupEditor,
  }) => {
    const base = await baseDocument(setupEditor, [
      { id: "next", type: "paragraph", content: "Next" },
    ]);
    const server = history(base);
    server.apply(
      await editOf(setupEditor, base, 1, (editor) =>
        editor.insertBlocks(
          [{ id: "parent", type: "paragraph", content: "Parent text" }],
          "next",
          "before",
        ),
      ),
      "alice",
    );
    const after = server.apply(
      await editOf(setupEditor, server.server, 2, toHeading),
      "bob",
    );
    expect(
      await diff(
        setupEditor,
        Y.encodeStateAsUpdateV2(base),
        after,
        server.attributions,
      ),
    ).toEqual([
      "insert <blockContainer>: alice",
      "insert <heading>: alice",
      "insert Parent text: alice",
    ]);
  });

  // Known limitation: a type change or a move re-creates the block, so the diff shows it deleted and inserted again. #3166 has a hacky prototype fix.
  it.fails("keeps later edits to a type-changed block as their author's", async ({
    setupEditor,
  }) => {
    const base = await blocks(setupEditor);
    const server = history(base);
    server.apply(await editOf(setupEditor, base, 2, toHeading), "bob");
    const after = server.apply(
      await editOf(setupEditor, server.server, 3, (editor) => {
        editor.setTextCursorPosition("parent", "end");
        editor.insertInlineContent(" by Carol");
      }),
      "carol",
    );
    expect(
      await diff(
        setupEditor,
        Y.encodeStateAsUpdateV2(base),
        after,
        server.attributions,
      ),
    ).toEqual(["attrs <heading>: bob", "insert  by Carol: carol"]);
  });

  it("shows both copies when two users change the type concurrently", async ({
    setupEditor,
  }) => {
    const base = await blocks(setupEditor);
    const bob = await editOf(setupEditor, base, 2, toHeading);
    const carol = await editOf(setupEditor, base, 3, (editor) =>
      editor.updateBlock("parent", { type: "bulletListItem" }),
    );
    const server = history(base);
    server.apply(bob, "bob");
    const after = server.apply(carol, "carol");
    const changes = await diff(
      setupEditor,
      Y.encodeStateAsUpdateV2(base),
      after,
      server.attributions,
    );
    // The `blockGroup` wrapper carries no attribution of its own (it is
    // persistent and shared); its children do.
    expect(changes.filter((change) => change.startsWith("insert <"))).toEqual([
      "insert <blockContainer>: bob",
      "insert <heading>: bob",
      "insert <blockContainer>: bob",
      "insert <paragraph>: bob",
      "insert <blockContainer>: carol",
      "insert <bulletListItem>: carol",
      "insert <blockContainer>: carol",
      "insert <paragraph>: carol",
    ]);
  });

  // Known limitation: a type change or a move re-creates the block, so the diff shows it deleted and inserted again. #3166 has a hacky prototype fix.
  it.fails("credits an indented block's text to its writer, from before it existed", async ({
    setupEditor,
  }) => {
    const base = await blocks(setupEditor);
    const server = history(base);
    server.apply(
      await editOf(setupEditor, base, 1, (editor) =>
        editor.insertBlocks(
          [{ id: "new", type: "paragraph", content: "New text" }],
          "next",
          "after",
        ),
      ),
      "alice",
    );
    const after = server.apply(
      await editOf(setupEditor, server.server, 2, (editor) => {
        editor.setTextCursorPosition("new");
        editor.nestBlock();
      }),
      "bob",
    );
    expect(
      await diff(
        setupEditor,
        Y.encodeStateAsUpdateV2(base),
        after,
        server.attributions,
      ),
    ).toEqual([
      // Bob's indent created the parent's child group.
      "insert <blockGroup>: bob",
      "insert <blockContainer>: alice",
      "insert <paragraph>: alice",
      "insert New text: alice",
    ]);
  });

  // Known limitation: a type change or a move re-creates the block, so the diff shows it deleted and inserted again. #3166 has a hacky prototype fix.
  it.fails("shows a block moved among its siblings as a move at both places", async ({
    setupEditor,
  }) => {
    const base = await baseDocument(setupEditor, [
      { id: "first", type: "paragraph", content: "First" },
      { id: "second", type: "paragraph", content: "Second" },
    ]);
    const server = history(base);
    const after = server.apply(
      await editOf(setupEditor, base, 2, (editor) => {
        editor.setTextCursorPosition("second");
        editor.moveBlocksUp();
      }),
      "bob",
    );
    expect(
      await diff(
        setupEditor,
        Y.encodeStateAsUpdateV2(base),
        after,
        server.attributions,
      ),
    ).toEqual([
      "moved <blockContainer>: bob",
      // The original, struck through at its old place.
      "moved from <blockContainer>: bob",
    ]);
  });

  // Known limitation: a type change or a move re-creates the block, so the diff shows it deleted and inserted again. #3166 has a hacky prototype fix.
  it.fails("shows a type change as a formatting change after the text was rewritten", async ({
    setupEditor,
  }) => {
    const base = await blocks(setupEditor);
    const server = history(base);
    // The rewrite reuses some characters, so the block's stored text mixes
    // kept characters with characters deleted before the type change.
    const rewritten = server.apply(
      await editOf(setupEditor, base, 1, (editor) =>
        editor.updateBlock("parent", { content: "Parts were rewritten" }),
      ),
      "alice",
    );
    const after = server.apply(
      await editOf(setupEditor, server.server, 2, toHeading),
      "bob",
    );
    expect(
      await diff(setupEditor, rewritten, after, server.attributions),
    ).toEqual(["attrs <heading>: bob"]);
  });

  // Known limitation: a type change or a move re-creates the block, so the diff shows it deleted and inserted again. #3166 has a hacky prototype fix.
  it.fails("strikes a moved block's children through with it at its old place", async ({
    setupEditor,
  }) => {
    const base = await baseDocument(setupEditor, [
      { id: "first", type: "paragraph", content: "First" },
      {
        id: "parent",
        type: "paragraph",
        content: "Parent",
        children: [{ id: "child", type: "paragraph", content: "Child" }],
      },
    ]);
    const server = history(base);
    const after = server.apply(
      await editOf(setupEditor, base, 2, (editor) => {
        editor.setTextCursorPosition("parent");
        editor.moveBlocksUp();
      }),
      "bob",
    );
    const { editor } = await showDiff(
      setupEditor,
      Y.encodeStateAsUpdateV2(base),
      after,
      server.attributions,
    );
    const struck: string[] = [];
    editor.transact(({ doc }) =>
      doc.descendants((node) => {
        if (
          node.type.name === "blockContainer" &&
          node.marks.some(
            (mark) =>
              mark.type.name === "y-attributed-delete" && mark.attrs["moved"],
          )
        ) {
          struck.push(node.textContent);
        }
        return true;
      }),
    );
    expect(struck).toEqual(["ParentChild"]);
  });

  it("shows only the child as deleted when the last child is removed", async ({
    setupEditor,
  }) => {
    // Deleting the only child leaves the parent in place: its (now empty)
    // child group stays in the document, hidden, so nothing re-creates the
    // parent.
    const base = await blocks(setupEditor);
    const server = history(base);
    const after = server.apply(
      await editOf(setupEditor, base, 2, (editor) =>
        editor.removeBlocks(["child"]),
      ),
      "bob",
    );
    const changes = await diff(
      setupEditor,
      Y.encodeStateAsUpdateV2(base),
      after,
      server.attributions,
    );
    expect(changes).toEqual(["delete <blockContainer>: bob"]);
  });

  // Known limitation: a type change or a move re-creates the block, so the diff shows it deleted and inserted again. #3166 has a hacky prototype fix.
  it.fails.for([
    { who: "the same user", outdenter: "bob" },
    { who: "a different user", outdenter: "carol" },
  ] as const)(
    "shows a block indented, then outdented by $who, as unchanged",
    async ({ outdenter }, { setupEditor }) => {
      const base = await blocks(setupEditor);
      const server = history(base);
      server.apply(
        await editOf(setupEditor, base, 2, (editor) => {
          editor.setTextCursorPosition("next");
          editor.nestBlock();
        }),
        "bob",
      );
      const after = server.apply(
        await editOf(setupEditor, server.server, 3, (editor) => {
          editor.setTextCursorPosition("next");
          editor.unnestBlock();
        }),
        outdenter,
      );
      expect(
        await diff(
          setupEditor,
          Y.encodeStateAsUpdateV2(base),
          after,
          server.attributions,
        ),
      ).toEqual([]);
    },
  );

  // Known limitation: a type change or a move re-creates the block, so the diff shows it deleted and inserted again. #3166 has a hacky prototype fix.
  it.fails("credits two type changes to the last one", async ({
    setupEditor,
  }) => {
    const base = await blocks(setupEditor);
    const server = history(base);
    server.apply(await editOf(setupEditor, base, 2, toHeading), "bob");
    const after = server.apply(
      await editOf(setupEditor, server.server, 3, (editor) =>
        editor.updateBlock("parent", { type: "bulletListItem" }),
      ),
      "carol",
    );
    expect(
      await diff(
        setupEditor,
        Y.encodeStateAsUpdateV2(base),
        after,
        server.attributions,
      ),
    ).toEqual(["attrs <bulletListItem>: carol"]);
  });

  it.for([
    {
      change: "a paragraph into an image",
      from: { type: "paragraph", content: "Some text" },
      to: { type: "image", props: { url: "https://example.com/a.png" } },
    },
    {
      change: "an image into a paragraph",
      from: { type: "image", props: { url: "https://example.com/a.png" } },
      to: { type: "paragraph", content: "New text" },
    },
  ] as const)(
    "shows turning $change as a deletion and an insertion",
    async ({ from, to }, { setupEditor }) => {
      const base = await baseDocument(setupEditor, [
        { id: "block", ...from },
        { id: "next", type: "paragraph", content: "Next" },
      ]);
      const server = history(base);
      const after = server.apply(
        await editOf(setupEditor, base, 2, (editor) =>
          editor.updateBlock("block", to),
        ),
        "bob",
      );
      const changes = await diff(
        setupEditor,
        Y.encodeStateAsUpdateV2(base),
        after,
        server.attributions,
      );
      expect(changes).toContain("delete <blockContainer>: bob");
      expect(changes).toContain("insert <blockContainer>: bob");
    },
  );
});

describe("version diff of a document several users wrote", () => {
  // Every word is typed by one user: "aaaa1" by alice, "bbbb1" by bob, ...
  const writers: Record<string, string> = {
    a: "alice",
    b: "bob",
    c: "carol",
    d: "dave",
  };
  function wordsIn(state: Uint8Array): Set<string> {
    const doc = ownedDoc();
    Y.applyUpdateV2(doc, state);
    return new Set(
      doc
        .get("doc")
        .toString()
        .match(/[a-d]{4}\d/g) ?? [],
    );
  }
  /** Words credited to someone else, or shown as new though they weren't. */
  function wrongCredits(doc: ProseMirrorNode, existed: Set<string>): string[] {
    const wrong: string[] = [];
    doc.descendants((node, pos) => {
      if (!node.isText) {
        return true;
      }
      const $pos = doc.resolve(pos);
      const marks = [...node.marks];
      for (let depth = $pos.depth; depth > 0; depth--) {
        marks.push(...$pos.node(depth).marks);
      }
      if (marks.some((mark) => mark.type.name === "y-attributed-delete")) {
        return true;
      }
      const inserted = marks.find(
        (mark) => mark.type.name === "y-attributed-insert",
      );
      for (const word of node.text!.match(/[a-d]{4}\d/g) ?? []) {
        const users: string[] = inserted?.attrs["userIds"] ?? [];
        if (existed.has(word)) {
          if (inserted && !inserted.attrs["moved"]) {
            wrong.push(
              `${word} existed, shown inserted by ${users.join(", ")}`,
            );
          }
        } else if (users.join() !== writers[word[0]]) {
          wrong.push(
            `${word} by ${writers[word[0]]}, credited to ${users.join(", ")}`,
          );
        }
      }
      return true;
    });
    return wrong;
  }

  // Known limitation: a type change or a move re-creates the block, so the diff shows it deleted and inserted again. #3166 has a hacky prototype fix.
  it.fails("credits every word to its writer, between any two versions", async ({
    setupEditor,
  }) => {
    const base = await baseDocument(setupEditor, [
      { id: "start", type: "paragraph", content: "" },
    ]);
    const server = history(base);
    const versions = [Y.encodeStateAsUpdateV2(base)];
    let client = 10;
    async function edit(
      user: string,
      change: (editor: BlockNoteEditor) => void,
    ) {
      versions.push(
        server.apply(
          await editOf(setupEditor, server.server, client++, change),
          user,
        ),
      );
    }
    // Alice reuses the empty block, so it was in the first version.
    await edit("alice", (editor) =>
      editor.replaceBlocks(editor.document, [
        { id: "p1", type: "paragraph", content: "aaaa1 aaaa2" },
        { id: "p2", type: "paragraph", content: "aaaa3" },
        {
          id: "p3",
          type: "paragraph",
          content: "aaaa4",
          children: [{ id: "c3", type: "paragraph", content: "aaaa5" }],
        },
        { id: "p4", type: "paragraph", content: "aaaa6" },
      ]),
    );
    await edit("bob", (editor) => {
      editor.setTextCursorPosition("p1", "end");
      editor.insertInlineContent(" bbbb1");
      editor.insertBlocks(
        [{ id: "p5", type: "paragraph", content: "bbbb2" }],
        "p2",
        "after",
      );
    });
    // Each of these re-creates blocks: p1 twice in one update.
    await edit("carol", (editor) => {
      editor.updateBlock("p1", { type: "heading" });
      editor.setTextCursorPosition("p2");
      editor.nestBlock();
      editor.setTextCursorPosition("p4");
      editor.moveBlocksUp();
    });
    await edit("alice", (editor) => {
      editor.setTextCursorPosition("p1", "end");
      editor.insertInlineContent(" aaaa7");
      editor.setTextCursorPosition("p4", "end");
      editor.insertInlineContent(" aaaa8");
    });
    await edit("dave", (editor) => {
      editor.removeBlocks(["c3"]);
      editor.setTextCursorPosition("p2");
      editor.unnestBlock();
      editor.updateBlock("p5", { type: "bulletListItem" });
      editor.setTextCursorPosition("p5", "end");
      editor.insertInlineContent(" dddd1");
    });
    await edit("carol", (editor) => {
      editor.updateBlock("p1", { type: "bulletListItem" });
      editor.setTextCursorPosition("p1", "end");
      editor.insertInlineContent(" cccc1");
    });

    const wrong: string[] = [];
    const words = versions.map(wordsIn);
    for (let later = 1; later < versions.length; later++) {
      const { editor, view, show } = await openDiff(
        setupEditor,
        versions[later],
      );
      try {
        for (let earlier = 0; earlier < later; earlier++) {
          show(versions[earlier], server.attributions);
          for (const problem of wrongCredits(
            editor.transact(({ doc }) => doc),
            words[earlier],
          )) {
            wrong.push(`${earlier} -> ${later}: ${problem}`);
          }
        }
      } finally {
        view.close();
      }
    }
    expect(wrong).toEqual([]);
  });
});

describe("version diff of a comment", () => {
  const commentMark = createExtension({
    key: "commentMark",
    tiptapExtensions: [CommentMark],
  });

  async function commentableEditor(setupEditor: SetupEditor, doc: Y.Doc) {
    const { editor } = await setupEditor({
      mountType: "dom",
      ...withCollaboration({
        extensions: [commentMark],
        collaboration: {
          fragment: doc.get("doc"),
          user: { name: "Test", color: "#ff0000" },
        },
      }),
    });
    return editor;
  }

  it("does not show an added comment as a formatting change", async ({
    setupEditor,
  }) => {
    const doc = ownedDoc({ gc: false });
    const editor = await commentableEditor(setupEditor, doc);
    editor.replaceBlocks(editor.document, [
      { id: "a", type: "paragraph", content: "Hello world" },
    ]);
    const before = Y.encodeStateAsUpdateV2(doc);
    // A comment on "Hello" and, as a control, bold on "world".
    editor.transact((tr) => {
      let start = -1;
      tr.doc.descendants((node, pos) => {
        if (node.isText && start === -1) {
          start = pos;
        }
      });
      tr.addMark(
        start,
        start + "Hello".length,
        editor.pmSchema.marks["comment"].create({ threadId: "thread" }),
      );
      tr.addMark(
        start + "Hello ".length,
        start + "Hello world".length,
        editor.pmSchema.marks["bold"].create(),
      );
    });
    const after = Y.encodeStateAsUpdateV2(doc);

    const viewerDoc = ownedDoc();
    Y.applyUpdateV2(viewerDoc, after);
    const viewer = await commentableEditor(setupEditor, viewerDoc);
    const view = openPreview(viewer, viewerDoc);
    view.show({
      content: after,
      comparison: { content: before },
      target: { type: "snapshot", id: "after" },
    });
    // What the reader sees: the rendered formatting changes.
    const formatChanges = [
      ...viewer.domElement!.querySelectorAll<HTMLElement>(
        '[data-type="modification"]',
      ),
    ].map((element) => ({
      text: element.textContent,
      format: Object.keys(JSON.parse(element.dataset["format"]!)),
    }));
    expect(formatChanges).toEqual([{ text: "world", format: ["bold"] }]);
  });
});
