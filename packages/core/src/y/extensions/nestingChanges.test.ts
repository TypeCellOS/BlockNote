/**
 * @vitest-environment jsdom
 */
import * as Y from "@y/y";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { blocksToYType, yDocToBlocks } from "../utils.js";
import { withCollaboration } from "./index.js";
import { createYVersionView } from "./Versioning.js";

type Editor = BlockNoteEditor<any, any, any>;

const editors: Editor[] = [];
afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor.unmount();
  }
});

function collaborativeEditor(doc: Y.Doc): Editor {
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

/** Two users editing copies of `blocks`, synced on demand. */
function twoUsers(blocks: any[]) {
  const docA = new Y.Doc({ gc: false });
  docA.clientID = 1;
  const seed = BlockNoteEditor.create();
  seed.replaceBlocks(seed.document, blocks);
  blocksToYType(seed, seed.document, docA.get("doc"));
  const docB = new Y.Doc({ gc: false });
  docB.clientID = 2;
  Y.applyUpdateV2(docB, Y.encodeStateAsUpdateV2(docA));
  return {
    docA,
    a: collaborativeEditor(docA),
    b: collaborativeEditor(docB),
    sync() {
      const toB = Y.encodeStateAsUpdateV2(docA, Y.encodeStateVector(docB));
      const toA = Y.encodeStateAsUpdateV2(docB, Y.encodeStateVector(docA));
      Y.applyUpdateV2(docB, toB);
      Y.applyUpdateV2(docA, toA);
    },
  };
}

/** The document as nested text, e.g. `P{X, Z}, N`. */
function outline(blocks: any[]): string {
  return blocks
    .map(
      (block) =>
        block.content.map((c: any) => c.text).join("") +
        (block.children.length ? `{${outline(block.children)}}` : ""),
    )
    .join(", ");
}

/** Number of `blockGroup`s directly inside the Y container of block `id`. */
function groupsOf(doc: Y.Doc, id: string): number[] {
  const groups: number[] = [];
  const visit = (node: Y.Node) => {
    for (const child of node.toArray()) {
      if (!(child instanceof Y.Node)) {
        continue;
      }
      if (child.name === "blockContainer" && child.getAttr("id") === id) {
        for (const part of child.toArray()) {
          if (part instanceof Y.Node && part.name === "blockGroup") {
            groups.push(part.length);
          }
        }
      }
      visit(child);
    }
  };
  visit(doc.get("doc"));
  return groups;
}

describe("concurrently created child groups", () => {
  function nestedTwice() {
    const users = twoUsers([
      { id: "p", type: "paragraph", content: "P" },
      { id: "x", type: "paragraph", content: "X" },
    ]);
    users.a.setTextCursorPosition("x");
    users.a.nestBlock();
    users.b.updateBlock("p", {
      children: [{ id: "z", type: "paragraph", content: "Z" }],
    });
    users.sync();
    return users;
  }

  // To be fixed by #3168.
  it.fails("shows both children under one parent", () => {
    const { a, b, docA } = nestedTwice();
    expect(outline(a.document)).toBe("P{X, Z}");
    expect(outline(b.document)).toBe("P{X, Z}");
    // Y keeps the two groups; only the view merges them.
    expect(groupsOf(docA, "p")).toEqual([1, 1]);
  });

  // To be fixed by #3168.
  it.fails("reads both children outside the editor", () => {
    const { docA } = nestedTwice();
    expect(outline(yDocToBlocks(BlockNoteEditor.create(), docA, "doc"))).toBe(
      "P{X, Z}",
    );
  });

  // To be fixed by #3168.
  it.fails("routes edits back to each child's own group", () => {
    const users = nestedTwice();
    users.a.setTextCursorPosition("z", "end");
    users.a.insertInlineContent("!");
    users.a.insertBlocks(
      [{ id: "n", type: "paragraph", content: "N" }],
      "x",
      "after",
    );
    users.sync();
    expect(outline(users.b.document)).toBe("P{X, N, Z!}");
    expect(groupsOf(users.docA, "p")).toEqual([2, 1]);

    users.a.removeBlocks(["z"]);
    users.sync();
    expect(outline(users.b.document)).toBe("P{X, N}");
    // The emptied group is kept, hidden.
    expect(groupsOf(users.docA, "p")).toEqual([2, 0]);
  });
});

describe("emptied child groups", () => {
  // To be fixed by #3168.
  it.fails("keeps a child added while another user removes the last one", () => {
    const users = twoUsers([
      {
        id: "p",
        type: "paragraph",
        content: "P",
        children: [{ id: "c", type: "paragraph", content: "C" }],
      },
    ]);
    users.a.removeBlocks(["c"]);
    users.b.insertBlocks(
      [{ id: "d", type: "paragraph", content: "D" }],
      "c",
      "after",
    );
    users.sync();
    expect(outline(users.a.document)).toBe("P{D}");
    expect(outline(users.b.document)).toBe("P{D}");
  });

  // To be fixed by #3168.
  it.fails("reuses a hidden group when nesting again", () => {
    const users = twoUsers([
      {
        id: "p",
        type: "paragraph",
        content: "P",
        children: [{ id: "c", type: "paragraph", content: "C" }],
      },
      { id: "x", type: "paragraph", content: "X" },
    ]);
    users.a.setTextCursorPosition("c");
    users.a.unnestBlock();
    expect(outline(users.a.document)).toBe("P, C, X");
    expect(groupsOf(users.docA, "p")).toEqual([0]);

    users.a.setTextCursorPosition("c");
    users.a.nestBlock();
    users.sync();
    expect(outline(users.b.document)).toBe("P{C}, X");
    expect(groupsOf(users.docA, "p")).toEqual([1]);
  });
});

describe("version diff of a nesting change", () => {
  function diffOf(change: (editor: Editor) => void, blocks: any[]) {
    const doc = new Y.Doc({ gc: false });
    const editor = collaborativeEditor(doc);
    editor.replaceBlocks(editor.document, blocks);
    const before = Y.encodeStateAsUpdateV2(doc);
    change(editor);
    const after = Y.encodeStateAsUpdateV2(doc);
    const view = createYVersionView(editor, doc.get("doc")).open();
    view.show({
      content: after,
      comparison: { content: before },
      target: { type: "snapshot", id: "after" },
    });
    const changed: string[] = [];
    editor.prosemirrorState.doc.descendants((node) => {
      const mark = node.marks.find((mark) =>
        ["y-attributed-insert", "y-attributed-delete"].includes(mark.type.name),
      );
      if (node.type.name === "blockContainer" && mark) {
        changed.push(
          `${mark.attrs["moved"] ? ">" : mark.type.name === "y-attributed-insert" ? "+" : "-"}${node.firstChild!.textContent}`,
        );
      }
      return true;
    });
    view.close();
    return changed;
  }

  it("shows an indent as a moved block, leaving the new parent unchanged", () => {
    expect(
      diffOf(
        (editor) => {
          editor.setTextCursorPosition("x");
          editor.nestBlock();
        },
        [
          { id: "p", type: "paragraph", content: "P" },
          { id: "x", type: "paragraph", content: "X" },
        ],
      ),
    ).toEqual([">X"]);
  });

  it("shows an unindent as a moved block, leaving the old parent unchanged", () => {
    expect(
      diffOf(
        (editor) => {
          editor.setTextCursorPosition("c");
          editor.unnestBlock();
        },
        [
          {
            id: "p",
            type: "paragraph",
            content: "P",
            children: [{ id: "c", type: "paragraph", content: "C" }],
          },
        ],
      ),
    ).toEqual([">C"]);
  });
});
