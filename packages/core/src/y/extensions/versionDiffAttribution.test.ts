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

/** One user's concurrent edit of `base`, as the update their client sends. */
function editOf(
  base: Y.Doc,
  client: number,
  edit: (editor: BlockNoteEditor<any, any, any>) => void,
) {
  const doc = new Y.Doc({ gc: false });
  doc.clientID = client;
  Y.applyUpdateV2(doc, Y.encodeStateAsUpdateV2(base));
  edit(collaborativeEditor(doc));
  return Y.encodeStateAsUpdateV2(doc, Y.encodeStateVector(base));
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
      { text: "Parent", mark: del, users: ["alice"] },
      { text: "[block child]", mark: del, users: ["alice"] },
      { text: "Child", mark: del, users: ["alice"] },
      { text: " by Bob", mark: del, users: [] },
      { text: "[block bobs]", mark: del, users: [] },
      { text: "Bob's block", mark: del, users: [] },
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

  it("does not attribute a move whose copy was lost to the mover", () => {
    const base = baseDocument([
      {
        id: "parent",
        type: "paragraph",
        content: "Parent",
        children: [{ id: "child", type: "paragraph", content: "Child" }],
      },
      { id: "moved", type: "paragraph", content: "Moved" },
    ]);
    // Bob moves a block into the parent, which deletes it and inserts a copy
    // there; Alice, who never receives the copy, deletes the parent.
    const bob = editOf(base, 2, (editor) => {
      editor.setTextCursorPosition("moved");
      editor.nestBlock();
    });
    const alice = editOf(base, 1, (editor) => editor.removeBlocks(["parent"]));

    const server = new Y.Doc({ gc: false });
    Y.applyUpdateV2(server, Y.encodeStateAsUpdateV2(base));
    Y.applyUpdateV2(server, alice);
    const withAlice = Y.encodeStateAsUpdateV2(server);
    Y.applyUpdateV2(server, bob);

    const { view, changes } = showDiff(
      withAlice,
      Y.encodeStateAsUpdateV2(server),
      deletedBy(bob, "bob"),
    );
    view.close();
    const del = "y-attributed-delete";
    expect(changes).toEqual([
      { text: "[block moved]", mark: del, users: [] },
      { text: "Moved", mark: del, users: [] },
    ]);
  });

  it("attributes a move to the mover", () => {
    const base = baseDocument([
      {
        id: "parent",
        type: "paragraph",
        content: "Parent",
        children: [{ id: "child", type: "paragraph", content: "Child" }],
      },
      { id: "moved", type: "paragraph", content: "Moved" },
    ]);
    const bob = editOf(base, 2, (editor) => {
      editor.setTextCursorPosition("moved");
      editor.nestBlock();
    });
    const server = new Y.Doc({ gc: false });
    Y.applyUpdateV2(server, Y.encodeStateAsUpdateV2(base));
    Y.applyUpdateV2(server, bob);

    const { view, changes } = showDiff(
      Y.encodeStateAsUpdateV2(base),
      Y.encodeStateAsUpdateV2(server),
      deletedBy(bob, "bob"),
    );
    view.close();
    expect(
      changes.filter((change) => change.mark === "y-attributed-delete"),
    ).toEqual([
      { text: "[block moved]", mark: "y-attributed-delete", users: ["bob"] },
      { text: "Moved", mark: "y-attributed-delete", users: ["bob"] },
    ]);
  });

  it("attributes a moved block to whoever deletes it afterwards", () => {
    const base = baseDocument([
      {
        id: "parent",
        type: "paragraph",
        content: "Parent",
        children: [{ id: "child", type: "paragraph", content: "Child" }],
      },
      { id: "moved", type: "paragraph", content: "Moved" },
    ]);
    const bob = editOf(base, 2, (editor) => {
      editor.setTextCursorPosition("moved");
      editor.nestBlock();
      editor.removeBlocks(["moved"]);
    });
    const server = new Y.Doc({ gc: false });
    Y.applyUpdateV2(server, Y.encodeStateAsUpdateV2(base));
    Y.applyUpdateV2(server, bob);

    const { view, changes } = showDiff(
      Y.encodeStateAsUpdateV2(base),
      Y.encodeStateAsUpdateV2(server),
      deletedBy(bob, "bob"),
    );
    view.close();
    expect(changes).toEqual([
      { text: "[block moved]", mark: "y-attributed-delete", users: ["bob"] },
      { text: "Moved", mark: "y-attributed-delete", users: ["bob"] },
    ]);
  });

  it.each([
    ["Bob", ["alice", "alice", "", ""]],
    ["Alice", ["", ""]],
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
      const [earlier, later, author] =
        first === "Bob" ? [bob, alice, "alice"] : [alice, bob, "bob"];
      const server = new Y.Doc({ gc: false });
      Y.applyUpdateV2(server, Y.encodeStateAsUpdateV2(base));
      Y.applyUpdateV2(server, earlier);
      const before = Y.encodeStateAsUpdateV2(server);
      Y.applyUpdateV2(server, later);

      const { view, changes } = showDiff(
        before,
        Y.encodeStateAsUpdateV2(server),
        deletedBy(later, author),
      );
      view.close();
      expect(
        changes
          .filter((change) => change.mark === "y-attributed-delete")
          .map((change) => change.users.join()),
      ).toEqual(expected);
    },
  );

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
