/**
 * @vitest-environment jsdom
 */
import * as Y from "@y/y";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { blocksToYType } from "../utils.js";
import { AttributionExtension } from "./AttributionExtension.js";
import { withCollaboration } from "./index.js";
import { createYVersionView } from "./Versioning.js";

const editors: BlockNoteEditor<any, any, any>[] = [];
afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor.unmount();
  }
});

function collaborativeEditor(doc: Y.Doc) {
  const editor = BlockNoteEditor.create(
    withCollaboration({
      collaboration: {
        fragment: doc.get("doc"),
        user: { name: "Test", color: "#ff0000" },
        experimental: {
          versionDiffFixes: "implicitDeleteAttributionAndRecreatedBlocks",
        },
      },
    }),
  );
  const element = document.createElement("div");
  document.body.appendChild(element);
  editor.mount(element);
  editors.push(editor);
  return editor;
}

function baseDocument(blocks: any[]) {
  const doc = new Y.Doc({ gc: false });
  doc.clientID = 100;
  const seed = BlockNoteEditor.create();
  seed.replaceBlocks(seed.document, blocks);
  blocksToYType(seed, seed.document, doc.get("doc"));
  return doc;
}

/**
 * One user's edit of `base`, as the updates their client sends. Unlike a state
 * update, these delete only what the user deleted.
 */
function editOf(
  base: Y.Doc,
  client: number,
  edit: (editor: BlockNoteEditor<any, any, any>) => void,
) {
  const doc = new Y.Doc({ gc: false });
  doc.clientID = client;
  Y.applyUpdateV2(doc, Y.encodeStateAsUpdateV2(base));
  const editor = collaborativeEditor(doc);
  const updates: Uint8Array<ArrayBuffer>[] = [];
  doc.on("updateV2", (update: Uint8Array<ArrayBuffer>) => updates.push(update));
  edit(editor);
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
  const server = new Y.Doc({ gc: false });
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

/** Show `after` compared to `before` and return each changed block and text. */
function showDiff(
  before: Uint8Array,
  after: Uint8Array,
  attributions?: Y.ContentMap,
) {
  const doc = new Y.Doc();
  Y.applyUpdateV2(doc, after);
  const editor = collaborativeEditor(doc);
  const view = createYVersionView(editor, doc.get("doc")).open();
  view.show({
    content: after,
    comparison: { content: before, attributions },
    target: { type: "snapshot", id: "after" },
  });
  const changes: Array<{ text: string; mark: string; users: string[] }> = [];
  editor.prosemirrorState.doc.descendants((node) => {
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
  });
  return { editor, view, changes };
}

describe("version diff of a deleted block", () => {
  it("does not attribute content added concurrently inside it to the deleter", () => {
    const base = baseDocument([
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
    const bob = editOf(base, 2, (editor) => {
      editor.setTextCursorPosition("child", "end");
      editor.insertInlineContent(" by Bob");
      editor.insertBlocks(
        [{ id: "bobs", type: "paragraph", content: "Bob's block" }],
        "child",
        "after",
      );
    });
    const alice = editOf(base, 1, (editor) => editor.removeBlocks(["parent"]));

    const server = new Y.Doc({ gc: false });
    Y.applyUpdateV2(server, Y.encodeStateAsUpdateV2(base));
    Y.applyUpdateV2(server, bob);
    const withBob = Y.encodeStateAsUpdateV2(server);
    Y.applyUpdateV2(server, alice);

    const { view, changes } = showDiff(
      withBob,
      Y.encodeStateAsUpdateV2(server),
      deletedBy(alice, "alice"),
    );
    view.close();
    const del = "y-attributed-delete";
    expect(changes).toEqual([
      { text: "[block parent]", mark: del, users: ["alice"] },
      { text: " by Bob", mark: del, users: [] },
      { text: "[block bobs]", mark: del, users: [] },
    ]);
  });

  it("names no author when hovering content removed with it", () => {
    const base = baseDocument([
      { id: "parent", type: "paragraph", content: "Parent" },
      { id: "next", type: "paragraph", content: "Next" },
    ]);
    const bob = editOf(base, 2, (editor) => {
      editor.setTextCursorPosition("parent", "end");
      editor.insertInlineContent(" by Bob");
    });
    const alice = editOf(base, 1, (editor) => editor.removeBlocks(["parent"]));
    const server = new Y.Doc({ gc: false });
    Y.applyUpdateV2(server, Y.encodeStateAsUpdateV2(base));
    Y.applyUpdateV2(server, bob);
    const withBob = Y.encodeStateAsUpdateV2(server);
    Y.applyUpdateV2(server, alice);

    const { editor, view } = showDiff(
      withBob,
      Y.encodeStateAsUpdateV2(server),
      deletedBy(alice, "alice"),
    );
    const hover = (text: string) => {
      const walker = document.createTreeWalker(
        editor.domElement!,
        NodeFilter.SHOW_TEXT,
      );
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.textContent === text) {
          node.parentElement!.dispatchEvent(
            new MouseEvent("mouseover", { bubbles: true }),
          );
        }
      }
      return editor.getExtension(AttributionExtension)!.store.state;
    };

    expect(hover("Parent")).toMatchObject({
      modificationType: "delete",
      users: ["alice"],
    });
    expect(hover(" by Bob")).toMatchObject({
      modificationType: "delete",
      users: [],
    });
    view.close();
  });

  it("does not show content inserted and deleted between the two versions", () => {
    const doc = new Y.Doc({ gc: false });
    const editor = collaborativeEditor(doc);
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

    const { view, changes } = showDiff(before, Y.encodeStateAsUpdateV2(doc));
    view.close();
    expect(changes).toEqual([
      { text: " kept", mark: "y-attributed-insert", users: [] },
    ]);
  });
});

describe("version diff of a moved block", () => {
  const blocks = () =>
    baseDocument([
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
  function nest(editor: BlockNoteEditor<any, any, any>) {
    editor.setTextCursorPosition("moved");
    editor.nestBlock();
  }
  function removeParent(editor: BlockNoteEditor<any, any, any>) {
    editor.removeBlocks(["parent"]);
  }
  function deletions(
    before: Uint8Array,
    after: Uint8Array,
    attributions: Y.ContentMap,
  ) {
    const { view, changes } = showDiff(before, after, attributions);
    view.close();
    return changes
      .filter((change) => change.mark === "y-attributed-delete")
      .map((change) => `${change.text}: ${change.users.join(", ")}`);
  }

  it("names no author for a block moved into a concurrently deleted one", () => {
    const base = blocks();
    const bob = editOf(base, 2, nest);
    const alice = editOf(base, 1, removeParent);
    const server = history(base);
    const before = server.apply(alice, "alice");
    const after = server.apply(bob, "bob");
    expect(deletions(before, after, server.attributions)).toEqual([
      "[block moved]: ",
    ]);
  });

  it("credits a child to its parent's deleter when its concurrent type change is lost", () => {
    const base = blocks();
    // Bob's type change replaces the child with a heading copy, which Alice's
    // deletion of the parent takes with it.
    const bob = editOf(base, 2, (editor) =>
      editor.updateBlock("child", { type: "heading" }),
    );
    const alice = editOf(base, 1, removeParent);
    const server = history(base);
    server.apply(alice, "alice");
    const after = server.apply(bob, "bob");
    expect(
      deletions(Y.encodeStateAsUpdateV2(base), after, server.attributions),
    ).toEqual(["[block parent]: alice"]);
  });

  it("names no author for a moved block that someone else deletes", () => {
    const base = blocks();
    const server = history(base);
    server.apply(editOf(base, 1, nest), "alice");
    const after = server.apply(editOf(server.server, 2, removeParent), "bob");
    expect(
      deletions(Y.encodeStateAsUpdateV2(base), after, server.attributions),
    ).toEqual(["[block parent]: bob", "[block moved]: "]);
  });

  // To be fixed by #3168.
  it.fails.each([
    ["Bob", ["[block n1]: alice", "N1: alice", "[block n2]: ", "N2: "]],
    ["Alice", ["[block n2]: ", "N2: "]],
  ])(
    "blames no one for a block lost to cascading indents (%s's saved first)",
    (first, expected) => {
      const base = baseDocument([
        { id: "n0", type: "paragraph", content: "N0" },
        { id: "n1", type: "paragraph", content: "N1" },
        { id: "n2", type: "paragraph", content: "N2" },
      ]);
      // Alice indents N1 under N0; Bob indents N2 under the N1 that Alice's
      // indent deletes (moving it under N0), so Bob's N2 is lost with it.
      const alice = editOf(base, 1, (editor) => {
        editor.setTextCursorPosition("n1");
        editor.nestBlock();
      });
      const bob = editOf(base, 2, (editor) => {
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
      expect(deletions(before, after, server.attributions)).toEqual(expected);
    },
  );
});

describe("version diff of a type change", () => {
  const blocks = () =>
    baseDocument([
      {
        id: "parent",
        type: "paragraph",
        content: "Parent text",
        children: [{ id: "child", type: "paragraph", content: "Child text" }],
      },
      { id: "next", type: "paragraph", content: "Next" },
    ]);
  function toHeading(editor: BlockNoteEditor<any, any, any>) {
    editor.updateBlock("parent", { type: "heading" });
  }
  /** Changes as `kind text: users`, attribute changes as `attrs <node>: users`. */
  function diff(before: Uint8Array, after: Uint8Array, map: Y.ContentMap) {
    const { editor, view } = showDiff(before, after, map);
    const out: string[] = [];
    editor.prosemirrorState.doc.descendants((node) => {
      const replaced = node.marks.some((mark) =>
        ["y-attributed-insert", "y-attributed-delete"].includes(mark.type.name),
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
    });
    view.close();
    return out;
  }

  it("shows a type change as a formatting change, not as replaced text", () => {
    const base = blocks();
    const server = history(base);
    const after = server.apply(editOf(base, 2, toHeading), "bob");
    expect(
      diff(Y.encodeStateAsUpdateV2(base), after, server.attributions),
    ).toEqual(["attrs <heading>: bob"]);
  });

  it("credits a type-changed block's text to its writer, from before it existed", () => {
    const base = baseDocument([
      { id: "next", type: "paragraph", content: "Next" },
    ]);
    const server = history(base);
    server.apply(
      editOf(base, 1, (editor) =>
        editor.insertBlocks(
          [{ id: "parent", type: "paragraph", content: "Parent text" }],
          "next",
          "before",
        ),
      ),
      "alice",
    );
    const after = server.apply(editOf(server.server, 2, toHeading), "bob");
    expect(
      diff(Y.encodeStateAsUpdateV2(base), after, server.attributions),
    ).toEqual([
      "insert <blockContainer>: alice",
      "insert <heading>: alice",
      "insert Parent text: alice",
    ]);
  });

  it("keeps later edits to a type-changed block as their author's", () => {
    const base = blocks();
    const server = history(base);
    server.apply(editOf(base, 2, toHeading), "bob");
    const after = server.apply(
      editOf(server.server, 3, (editor) => {
        editor.setTextCursorPosition("parent", "end");
        editor.insertInlineContent(" by Carol");
      }),
      "carol",
    );
    expect(
      diff(Y.encodeStateAsUpdateV2(base), after, server.attributions),
    ).toEqual(["attrs <heading>: bob", "insert  by Carol: carol"]);
  });

  it("shows both copies when two users change the type concurrently", () => {
    const base = blocks();
    const bob = editOf(base, 2, toHeading);
    const carol = editOf(base, 3, (editor) =>
      editor.updateBlock("parent", { type: "bulletListItem" }),
    );
    const server = history(base);
    server.apply(bob, "bob");
    const after = server.apply(carol, "carol");
    const changes = diff(
      Y.encodeStateAsUpdateV2(base),
      after,
      server.attributions,
    );
    expect(changes.filter((change) => change.startsWith("insert <"))).toEqual([
      "insert <blockContainer>: bob",
      "insert <heading>: bob",
      "insert <blockGroup>: bob",
      "insert <blockContainer>: bob",
      "insert <paragraph>: bob",
      "insert <blockContainer>: carol",
      "insert <bulletListItem>: carol",
      "insert <blockGroup>: carol",
      "insert <blockContainer>: carol",
      "insert <paragraph>: carol",
    ]);
  });

  it("credits an indented block's text to its writer, from before it existed", () => {
    const base = blocks();
    const server = history(base);
    server.apply(
      editOf(base, 1, (editor) =>
        editor.insertBlocks(
          [{ id: "new", type: "paragraph", content: "New text" }],
          "next",
          "after",
        ),
      ),
      "alice",
    );
    const after = server.apply(
      editOf(server.server, 2, (editor) => {
        editor.setTextCursorPosition("new");
        editor.nestBlock();
      }),
      "bob",
    );
    expect(
      diff(Y.encodeStateAsUpdateV2(base), after, server.attributions),
    ).toEqual([
      // Bob's indent created the parent's child group.
      "insert <blockGroup>: bob",
      "insert <blockContainer>: alice",
      "insert <paragraph>: alice",
      "insert New text: alice",
    ]);
  });

  it("shows a block moved among its siblings as a move at both places", () => {
    const base = baseDocument([
      { id: "first", type: "paragraph", content: "First" },
      { id: "second", type: "paragraph", content: "Second" },
    ]);
    const server = history(base);
    const after = server.apply(
      editOf(base, 2, (editor) => {
        editor.setTextCursorPosition("second");
        editor.moveBlocksUp();
      }),
      "bob",
    );
    expect(
      diff(Y.encodeStateAsUpdateV2(base), after, server.attributions),
    ).toEqual([
      "moved <blockContainer>: bob",
      // The original, struck through at its old place.
      "moved from <blockContainer>: bob",
    ]);
  });

  it("shows a type change as a formatting change after the text was rewritten", () => {
    const base = blocks();
    const server = history(base);
    // The rewrite reuses some characters, so the block's stored text mixes
    // kept characters with characters deleted before the type change.
    const rewritten = server.apply(
      editOf(base, 1, (editor) =>
        editor.updateBlock("parent", { content: "Parts were rewritten" }),
      ),
      "alice",
    );
    const after = server.apply(editOf(server.server, 2, toHeading), "bob");
    expect(diff(rewritten, after, server.attributions)).toEqual([
      "attrs <heading>: bob",
    ]);
  });

  // To be fixed by #3166.
  it.fails("strikes a moved block's children through with it at its old place", () => {
    const base = baseDocument([
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
      editOf(base, 2, (editor) => {
        editor.setTextCursorPosition("parent");
        editor.moveBlocksUp();
      }),
      "bob",
    );
    const { editor, view } = showDiff(
      Y.encodeStateAsUpdateV2(base),
      after,
      server.attributions,
    );
    const struck: string[] = [];
    editor.prosemirrorState.doc.descendants((node) => {
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
    });
    view.close();
    expect(struck).toEqual(["ParentChild"]);
  });

  it("shows a block that lost content as deleted and inserted, not as a copy", () => {
    // Deleting the only child re-creates the parent without it: the child
    // is lost, so the parent isn't shown as an unchanged copy.
    const base = blocks();
    const server = history(base);
    const after = server.apply(
      editOf(base, 2, (editor) => editor.removeBlocks(["child"])),
      "bob",
    );
    const changes = diff(
      Y.encodeStateAsUpdateV2(base),
      after,
      server.attributions,
    );
    expect(changes).toEqual([
      "delete <blockContainer>: bob",
      "insert <blockContainer>: bob",
      "insert <paragraph>: bob",
      "insert Parent text: bob",
    ]);
  });

  // To be fixed by #3166.
  it.fails.each([
    ["the same user", "bob"],
    ["a different user", "carol"],
  ])(
    "shows a block indented, then outdented by %s, as unchanged",
    (_, outdenter) => {
      const base = blocks();
      const server = history(base);
      server.apply(
        editOf(base, 2, (editor) => {
          editor.setTextCursorPosition("next");
          editor.nestBlock();
        }),
        "bob",
      );
      const after = server.apply(
        editOf(server.server, 3, (editor) => {
          editor.setTextCursorPosition("next");
          editor.unnestBlock();
        }),
        outdenter,
      );
      expect(
        diff(Y.encodeStateAsUpdateV2(base), after, server.attributions),
      ).toEqual([]);
    },
  );

  // To be fixed by #3166.
  it.fails("credits two type changes to the last one", () => {
    const base = blocks();
    const server = history(base);
    server.apply(editOf(base, 2, toHeading), "bob");
    const after = server.apply(
      editOf(server.server, 3, (editor) =>
        editor.updateBlock("parent", { type: "bulletListItem" }),
      ),
      "carol",
    );
    expect(
      diff(Y.encodeStateAsUpdateV2(base), after, server.attributions),
    ).toEqual(["attrs <bulletListItem>: carol"]);
  });

  it.each([
    [
      "a paragraph into an image",
      { type: "paragraph", content: "Some text" },
      { type: "image", props: { url: "https://example.com/a.png" } },
    ],
    [
      "an image into a paragraph",
      { type: "image", props: { url: "https://example.com/a.png" } },
      { type: "paragraph", content: "New text" },
    ],
  ])("shows turning %s as a deletion and an insertion", (_, from, to) => {
    const base = baseDocument([
      { id: "block", ...from },
      { id: "next", type: "paragraph", content: "Next" },
    ]);
    const server = history(base);
    const after = server.apply(
      editOf(base, 2, (editor) => editor.updateBlock("block", to as any)),
      "bob",
    );
    const changes = diff(
      Y.encodeStateAsUpdateV2(base),
      after,
      server.attributions,
    );
    expect(changes).toContain("delete <blockContainer>: bob");
    expect(changes).toContain("insert <blockContainer>: bob");
  });
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
    const doc = new Y.Doc();
    Y.applyUpdateV2(doc, state);
    return new Set(
      doc
        .get("doc")
        .toString()
        .match(/[a-d]{4}\d/g) ?? [],
    );
  }
  /** Words credited to someone else, or shown as new though they weren't. */
  function wrongCredits(
    before: Uint8Array,
    after: Uint8Array,
    attributions: Y.ContentMap,
  ): string[] {
    const existed = wordsIn(before);
    const { editor, view } = showDiff(before, after, attributions);
    const wrong: string[] = [];
    editor.prosemirrorState.doc.descendants((node, pos) => {
      if (!node.isText) {
        return true;
      }
      const $pos = editor.prosemirrorState.doc.resolve(pos);
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
    view.close();
    return wrong;
  }

  // To be fixed by #3166.
  it.fails("credits every word to its writer, between any two versions", () => {
    const base = baseDocument([
      { id: "start", type: "paragraph", content: "" },
    ]);
    const server = history(base);
    const versions = [Y.encodeStateAsUpdateV2(base)];
    let client = 10;
    function edit(user: string, change: (editor: BlockNoteEditor) => void) {
      versions.push(
        server.apply(editOf(server.server, client++, change), user),
      );
    }
    // Alice reuses the empty block, so it was in the first version.
    edit("alice", (editor) =>
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
    edit("bob", (editor) => {
      editor.setTextCursorPosition("p1", "end");
      editor.insertInlineContent(" bbbb1");
      editor.insertBlocks(
        [{ id: "p5", type: "paragraph", content: "bbbb2" }],
        "p2",
        "after",
      );
    });
    // Each of these re-creates blocks: p1 twice in one update.
    edit("carol", (editor) => {
      editor.updateBlock("p1", { type: "heading" });
      editor.setTextCursorPosition("p2");
      editor.nestBlock();
      editor.setTextCursorPosition("p4");
      editor.moveBlocksUp();
    });
    edit("alice", (editor) => {
      editor.setTextCursorPosition("p1", "end");
      editor.insertInlineContent(" aaaa7");
      editor.setTextCursorPosition("p4", "end");
      editor.insertInlineContent(" aaaa8");
    });
    edit("dave", (editor) => {
      editor.removeBlocks(["c3"]);
      editor.setTextCursorPosition("p2");
      editor.unnestBlock();
      editor.updateBlock("p5", { type: "bulletListItem" });
      editor.setTextCursorPosition("p5", "end");
      editor.insertInlineContent(" dddd1");
    });
    edit("carol", (editor) => {
      editor.updateBlock("p1", { type: "bulletListItem" });
      editor.setTextCursorPosition("p1", "end");
      editor.insertInlineContent(" cccc1");
    });

    const wrong: string[] = [];
    for (let later = 1; later < versions.length; later++) {
      for (let earlier = 0; earlier < later; earlier++) {
        for (const problem of wrongCredits(
          versions[earlier],
          versions[later],
          server.attributions,
        )) {
          wrong.push(`${earlier} -> ${later}: ${problem}`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });
});
