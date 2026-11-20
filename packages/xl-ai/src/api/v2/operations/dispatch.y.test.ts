import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { blocksToYDoc, yDocToBlocks } from "@blocknote/core/y";
import * as Y from "@y/y";
import { describe, expect, it } from "vite-plus/test";

import { updateDocument } from "../index.js";
import { valid } from "../testUtil/valid.js";
import { bindEditor, typeAfter } from "../testUtil/y.js";

/**
 * A write of `updateDocument` to an editor that is bound to a Y.Doc with the
 * Yjs 14 binding of `@blocknote/core/y`. The write is one transaction. The
 * binding writes the difference of the document to the Y.Doc, and it pairs
 * two blocks only if they have the same block ID (`blockMatchNodes` of
 * core).
 *
 * In each test of the first group, another replica changes the document at
 * the same time. Then the two replicas sync. The change of the other replica
 * must be in its block. The first four cases fail with a binding that pairs
 * the changed blocks of a list by their type only: the text that the other
 * replica typed then goes into a different block, or is lost.
 */

const reader = BlockNoteEditor.create();

const paragraph = (id: string, content: string): PartialBlock => ({
  id,
  type: "paragraph",
  content,
});

const three = [
  paragraph("a", "Alpha"),
  paragraph("b", "Beta"),
  paragraph("c", "Gamma"),
];

/** The ID, the type and the text of each block of the Y.Doc. */
function blocksOf(ydoc: Y.Doc) {
  return yDocToBlocks(reader, ydoc).map((block) => [
    block.id,
    block.type,
    (block.content as { text: string }[])[0]?.text,
  ]);
}

/**
 * A write of `document` to a bound editor, while another replica types
 * `typed` after the text `after`. Returns the blocks after the sync of the
 * two replicas.
 */
function writeWhileOtherTypes(
  blocks: PartialBlock[],
  document: PartialBlock[],
  [after, typed]: [string, string],
) {
  const ydoc = blocksToYDoc(
    reader,
    BlockNoteEditor.create({ initialContent: blocks }).document,
  );
  const other = new Y.Doc();
  Y.applyUpdate(other, Y.encodeStateAsUpdate(ydoc));
  const editor = bindEditor(ydoc.get("prosemirror"), { trailingBlock: false });
  typeAfter(
    bindEditor(other.get("prosemirror"), { trailingBlock: false }),
    after,
    typed,
  );

  valid(updateDocument(editor, { base: "current", document }));

  Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(other, Y.encodeStateVector(ydoc)));
  Y.applyUpdate(other, Y.encodeStateAsUpdate(ydoc, Y.encodeStateVector(other)));
  expect(blocksOf(other)).toEqual(blocksOf(ydoc));
  return blocksOf(ydoc);
}

describe("a write to a bound editor while another replica types", () => {
  it("keeps a change of another replica in a block, with an insert before that block", () => {
    expect(
      writeWhileOtherTypes(
        three,
        [
          paragraph("a", "Alpha"),
          paragraph("new", "New"),
          paragraph("b", "Changed Beta"),
          paragraph("c", "Gamma"),
        ],
        ["Beta", "!"],
      ),
    ).toEqual([
      ["a", "paragraph", "Alpha"],
      ["new", "paragraph", "New"],
      ["b", "paragraph", "Changed Beta!"],
      ["c", "paragraph", "Gamma"],
    ]);
  });

  it("keeps a change of another replica in a block, with a removal before that block", () => {
    expect(
      writeWhileOtherTypes(
        three,
        [paragraph("b", "Changed Beta"), paragraph("c", "Gamma")],
        ["Beta", "!"],
      ),
    ).toEqual([
      ["b", "paragraph", "Changed Beta!"],
      ["c", "paragraph", "Gamma"],
    ]);
  });

  it("does not put a change of another replica to a removed block into the new block at its place", () => {
    expect(
      writeWhileOtherTypes(
        three,
        [
          paragraph("a", "Alpha"),
          paragraph("new", "New"),
          paragraph("c", "Gamma"),
        ],
        ["Beta", "!"],
      ),
    ).toEqual([
      ["a", "paragraph", "Alpha"],
      ["new", "paragraph", "New"],
      ["c", "paragraph", "Gamma"],
    ]);
  });

  it("keeps a change of another replica in a block, with a type change of the block before it", () => {
    expect(
      writeWhileOtherTypes(
        three,
        [
          { id: "a", type: "heading", content: "Alpha" },
          paragraph("b", "Changed Beta"),
          paragraph("c", "Gamma"),
        ],
        ["Beta", "!"],
      ),
    ).toEqual([
      ["a", "heading", "Alpha"],
      ["b", "paragraph", "Changed Beta!"],
      ["c", "paragraph", "Gamma"],
    ]);
  });

  it("keeps a change of another replica in a block, with inserts at the start and at the end of the list", () => {
    expect(
      writeWhileOtherTypes(
        three,
        [paragraph("first", "First"), ...three, paragraph("last", "Last")],
        ["Alpha", " of the other client"],
      ),
    ).toEqual([
      ["first", "paragraph", "First"],
      ["a", "paragraph", "Alpha of the other client"],
      ["b", "paragraph", "Beta"],
      ["c", "paragraph", "Gamma"],
      ["last", "paragraph", "Last"],
    ]);
  });

  it("keeps a change of another replica between two changes in one paragraph", () => {
    expect(
      writeWhileOtherTypes(
        [paragraph("p", "one two three")],
        [paragraph("p", "First one two three Last")],
        ["tw", "X"],
      ),
    ).toEqual([["p", "paragraph", "First one twXo three Last"]]);
  });

  it("keeps a change of another replica in a block, with text changes of two adjacent blocks", () => {
    expect(
      writeWhileOtherTypes(
        three,
        [
          paragraph("a", "Changed Alpha"),
          paragraph("b", "Changed Beta"),
          paragraph("c", "Gamma"),
        ],
        ["Beta", "!"],
      ),
    ).toEqual([
      ["a", "paragraph", "Changed Alpha"],
      ["b", "paragraph", "Changed Beta!"],
      ["c", "paragraph", "Gamma"],
    ]);
  });

  it("keeps a change of another replica in a block that a move passes", () => {
    expect(
      writeWhileOtherTypes(
        three,
        [
          paragraph("c", "Gamma"),
          paragraph("a", "Alpha"),
          paragraph("b", "Beta"),
        ],
        ["Beta", "!"],
      ),
    ).toEqual([
      ["c", "paragraph", "Gamma"],
      ["a", "paragraph", "Alpha"],
      ["b", "paragraph", "Beta!"],
    ]);
  });
});

describe("the undo history of a bound editor", () => {
  it("has a write of updateDocument as one undo step", () => {
    const ydoc = blocksToYDoc(
      reader,
      BlockNoteEditor.create({
        initialContent: [...three, paragraph("d", "Delta")],
      }).document,
    );
    const editor = bindEditor(ydoc.get("prosemirror"), {
      trailingBlock: false,
    });
    const before = blocksOf(ydoc);

    // The write removes "c", inserts "new", and changes "a" and "d".
    valid(
      updateDocument(editor, {
        base: "current",
        document: [
          paragraph("a", "Alpha changed"),
          paragraph("new", "New"),
          paragraph("b", "Beta"),
          paragraph("d", "Delta changed"),
        ],
      }),
    );
    expect(blocksOf(ydoc).map(([, , text]) => text)).toEqual([
      "Alpha changed",
      "New",
      "Beta",
      "Delta changed",
    ]);

    editor.undo();

    expect(blocksOf(ydoc)).toEqual(before);
  });
});
