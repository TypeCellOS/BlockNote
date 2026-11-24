import * as Y from "@y/y";
import { afterEach, describe, expect } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { blocksToYType, yDocToBlocks } from "../utils.js";
import { withCollaboration } from "./index.js";

/**
 * The node-pairing policy of the sync binding (`blockMatchNodes`), with live
 * editors. The policy pairs two blocks only if they have the same block ID,
 * or the same content (then only the ID changed).
 *
 * 1. One user changes the document in one transaction, while another user
 *    types in a block. The typed text must stay in its block.
 * 2. A document can have two blocks with one ID: two users changed the type
 *    of one block, or moved one block, at the same time. These tests show
 *    what the policy does with such a document.
 */

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
      trailingBlock: false,
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

/** A replica of `source`, with its own client ID. */
function replicaOf(source: Y.Doc, clientID: number): Y.Doc {
  const doc = new Y.Doc({ gc: false });
  doc.clientID = clientID;
  Y.applyUpdateV2(doc, Y.encodeStateAsUpdateV2(source));
  return doc;
}

/** Sends each replica the updates of the others, until all have them. */
async function sync(docs: Y.Doc[]) {
  for (let round = 0; round < 8; round++) {
    for (const from of docs) {
      for (const to of docs) {
        if (from !== to) {
          Y.applyUpdateV2(
            to,
            Y.encodeStateAsUpdateV2(from, Y.encodeStateVector(to)),
          );
        }
      }
    }
    // An editor can answer an update with a change of its own.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

/** Two users with an editor each, on replicas of a document with `blocks`. */
function twoUsers(blocks: any[]) {
  const first = new Y.Doc({ gc: false });
  first.clientID = 1;
  const seed = BlockNoteEditor.create();
  seed.replaceBlocks(seed.document, blocks);
  blocksToYType(seed, seed.document, first.get("doc"));
  const docs = [first, replicaOf(first, 2)];
  const [a, b] = docs.map(collaborativeEditor);
  return { docs, a, b };
}

const reader = BlockNoteEditor.create();

/** The document of a replica, e.g. `a:paragraph:Alpha{child:paragraph:Text} | b:heading:Beta`. */
function outline(doc: Y.Doc): string {
  const line = (blocks: any[]): string =>
    blocks
      .map(
        (block) =>
          `${block.id}:${block.type}:${block.content.map((c: any) => c.text).join("")}` +
          (block.children.length ? `{${line(block.children)}}` : ""),
      )
      .join(" | ");
  return line(yDocToBlocks(reader, doc, "doc"));
}

/** Syncs the replicas, checks that they are equal, and returns the document. */
async function synced(docs: Y.Doc[]): Promise<string> {
  await sync(docs);
  const outlines = docs.map(outline);
  expect(new Set(outlines).size).toBe(1);
  return outlines[0];
}

/** Types `value` after the first occurrence of `after`, as a user of the editor. */
function typeAfter(editor: Editor, after: string, value: string) {
  let position: number | undefined;
  editor.prosemirrorState.doc.descendants((node, pos) => {
    const index = node.isText ? (node.text ?? "").indexOf(after) : -1;
    if (position === undefined && index !== -1) {
      position = pos + index + after.length;
    }
  });
  if (position === undefined) {
    throw new Error(`Text ${JSON.stringify(after)} not found`);
  }
  const at = position;
  editor.transact((tr) => tr.insertText(value, at));
}

function paragraph(id: string, content: string, children: any[] = []) {
  return { id, type: "paragraph", content, children };
}

const three = () => [
  paragraph("a", "Alpha"),
  paragraph("b", "Beta"),
  paragraph("c", "Gamma"),
];

describe("a transaction of one user, while another user types in a block", () => {
  /**
   * User 1 makes `edit` in one transaction, and user 2 types `typed` after
   * the text `after`. Returns the document after the sync.
   */
  async function concurrent(
    blocks: any[],
    edit: (editor: Editor) => void,
    [after, typed]: [string, string],
  ) {
    const { docs, a, b } = twoUsers(blocks);
    a.transact(() => edit(a));
    typeAfter(b, after, typed);
    return synced(docs);
  }

  // The first four cases need the block ID. With the type of a block alone,
  // the binding paired "b" with the block next to it, and the typed text
  // went into that block, or was lost.

  it("keeps the typed text in its block, with an insert before that block", async () => {
    expect(
      await concurrent(
        three(),
        (editor) => {
          editor.insertBlocks([paragraph("new", "New")], "a", "after");
          editor.updateBlock("b", { content: "Changed Beta" });
        },
        ["Beta", "!"],
      ),
    ).toBe(
      "a:paragraph:Alpha | new:paragraph:New | b:paragraph:Changed Beta! | c:paragraph:Gamma",
    );
  });

  it("keeps the typed text in its block, with a removal before that block", async () => {
    expect(
      await concurrent(
        three(),
        (editor) => {
          editor.removeBlocks(["a"]);
          editor.updateBlock("b", { content: "Changed Beta" });
        },
        ["Beta", "!"],
      ),
    ).toBe("b:paragraph:Changed Beta! | c:paragraph:Gamma");
  });

  it("does not put text typed in a removed block into the new block at its place", async () => {
    expect(
      await concurrent(
        three(),
        (editor) => {
          editor.insertBlocks([paragraph("new", "New")], "b", "after");
          editor.removeBlocks(["b"]);
        },
        ["Beta", "!"],
      ),
    ).toBe("a:paragraph:Alpha | new:paragraph:New | c:paragraph:Gamma");
  });

  it("keeps the typed text in its block, with a type change of the block before it", async () => {
    expect(
      await concurrent(
        three(),
        (editor) => {
          editor.updateBlock("a", { type: "heading" });
          editor.updateBlock("b", { content: "Changed Beta" });
        },
        ["Beta", "!"],
      ),
    ).toBe("a:heading:Alpha | b:paragraph:Changed Beta! | c:paragraph:Gamma");
  });

  // These cases also passed without the block ID.

  it("keeps the typed text in its block, with inserts at the start and at the end of the list", async () => {
    expect(
      await concurrent(
        three(),
        (editor) => {
          editor.insertBlocks([paragraph("first", "First")], "a", "before");
          editor.insertBlocks([paragraph("last", "Last")], "c", "after");
        },
        ["Alpha", " of the other user"],
      ),
    ).toBe(
      "first:paragraph:First | a:paragraph:Alpha of the other user | b:paragraph:Beta | c:paragraph:Gamma | last:paragraph:Last",
    );
  });

  it("keeps the typed text between two changes in one paragraph", async () => {
    expect(
      await concurrent(
        [paragraph("p", "one two three")],
        (editor) => {
          editor.updateBlock("p", { content: "First one two three Last" });
        },
        ["tw", "X"],
      ),
    ).toBe("p:paragraph:First one twXo three Last");
  });

  it("keeps the typed text in its block, with text changes of two adjacent blocks", async () => {
    expect(
      await concurrent(
        three(),
        (editor) => {
          editor.updateBlock("a", { content: "Changed Alpha" });
          editor.updateBlock("b", { content: "Changed Beta" });
        },
        ["Beta", "!"],
      ),
    ).toBe(
      "a:paragraph:Changed Alpha | b:paragraph:Changed Beta! | c:paragraph:Gamma",
    );
  });

  it("keeps the typed text in a block that a move passes", async () => {
    expect(
      await concurrent(
        three(),
        (editor) => {
          const moved = editor.getBlock("c")!;
          editor.removeBlocks(["c"]);
          editor.insertBlocks([moved], "a", "before");
        },
        ["Beta", "!"],
      ),
    ).toBe("c:paragraph:Gamma | a:paragraph:Alpha | b:paragraph:Beta!");
  });
});

describe("a document with two blocks with one ID", () => {
  /** Moves the block `id` in one transaction: a removal and an insert. */
  function move(
    editor: Editor,
    id: string,
    reference: string,
    placement: "before" | "after",
  ) {
    editor.transact(() => {
      const moved = editor.getBlock(id)!;
      editor.removeBlocks([id]);
      editor.insertBlocks([moved], reference, placement);
    });
  }

  /** Two users change the type of the block "parent" at the same time. */
  async function typeChangedTwoTimes() {
    const users = twoUsers([
      paragraph("parent", "Parent text", [paragraph("child", "Child text")]),
      paragraph("next", "Next"),
    ]);
    users.a.updateBlock("parent", { type: "heading" });
    users.b.updateBlock("parent", { type: "bulletListItem" });
    const document = await synced(users.docs);
    return { ...users, document };
  }

  /** Two users move the block "c" to different places at the same time. */
  async function movedTwoTimes() {
    const users = twoUsers([
      paragraph("a", "Alpha"),
      paragraph("b", "Beta"),
      paragraph("c", "Gamma"),
      paragraph("d", "Delta"),
      paragraph("e", "Echo"),
    ]);
    move(users.a, "c", "a", "before");
    move(users.b, "c", "e", "after");
    const document = await synced(users.docs);
    return { ...users, document };
  }

  it("has two copies of a block after two users change its type at the same time", async () => {
    // A type change replaces the block (see blockMatchNodes.ts). Thus, each
    // user removes the block and inserts a copy with the same ID.
    const { docs, a, document } = await typeChangedTwoTimes();
    expect(document).toBe(
      "parent:heading:Parent text{child:paragraph:Child text} | parent:bulletListItem:Parent text{child:paragraph:Child text} | next:paragraph:Next",
    );

    // The editors that were open keep the two copies. Text that a user types
    // in a copy stays in that copy.
    typeAfter(a, "Parent text", " (edit)");
    expect(await synced(docs)).toBe(
      "parent:heading:Parent text (edit){child:paragraph:Child text} | parent:bulletListItem:Parent text{child:paragraph:Child text} | next:paragraph:Next",
    );
  });

  it("has two copies of a block after two users move it at the same time", async () => {
    const { docs, b, document } = await movedTwoTimes();
    expect(document).toBe(
      "c:paragraph:Gamma | a:paragraph:Alpha | b:paragraph:Beta | d:paragraph:Delta | e:paragraph:Echo | c:paragraph:Gamma",
    );

    typeAfter(b, "Alpha", " (edit)");
    expect(await synced(docs)).toBe(
      "c:paragraph:Gamma | a:paragraph:Alpha (edit) | b:paragraph:Beta | d:paragraph:Delta | e:paragraph:Echo | c:paragraph:Gamma",
    );
  });

  // An editor that loads such a document gives the copies new IDs (the
  // unique ID extension finds the two IDs in the one range of the load),
  // and the binding writes that change to the Y.Doc. A block with a new ID
  // and the same content is the same block for the policy: the binding changes
  // the `id` attribute in place. As a removal and an insert of each copy,
  // the tests below fail: two clients that load at the same time each add
  // their own copies (5 blocks in place of 3, 8 in place of 6), and text
  // that a user types in a copy at that time is lost.

  /** The number of blocks at the top level, after `count` new clients load the document at the same time. */
  async function blocksAfterLoad(docs: Y.Doc[], count: number) {
    const loaded = Array.from({ length: count }, (_, index) =>
      replicaOf(docs[0], 10 + index),
    );
    loaded.forEach(collaborativeEditor);
    const all = [...docs, ...loaded];
    await synced(all);
    return yDocToBlocks(reader, all[0], "doc").length;
  }

  it("keeps the number of blocks when one new client loads the document", async () => {
    expect(await blocksAfterLoad((await typeChangedTwoTimes()).docs, 1)).toBe(
      3,
    );
    expect(await blocksAfterLoad((await movedTwoTimes()).docs, 1)).toBe(6);
  });

  it("keeps the number of blocks when two new clients load a document with a type change by two users", async () => {
    expect(await blocksAfterLoad((await typeChangedTwoTimes()).docs, 2)).toBe(
      3,
    );
  });

  it("keeps the number of blocks when two new clients load a document with a move by two users", async () => {
    expect(await blocksAfterLoad((await movedTwoTimes()).docs, 2)).toBe(6);
  });

  it("keeps text that a user types in a copy while a new client loads the document", async () => {
    const { docs, a } = await typeChangedTwoTimes();
    const loaded = replicaOf(docs[0], 10);
    collaborativeEditor(loaded);
    typeAfter(a, "Parent text", " (edit)");
    expect(await synced([...docs, loaded])).toContain("Parent text (edit)");
  });
});
