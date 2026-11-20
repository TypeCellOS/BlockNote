import { BlockNoteEditor, type PartialBlock } from "@blocknote/core";
import { blocksToYDoc, yDocToBlocks } from "@blocknote/core/y";
import * as Y from "@y/y";
import { describe, expect, it } from "vite-plus/test";

import { bindEditor } from "../testUtil/y.js";
import { applyOperations } from "./applyOperations.js";
import { dispatchSteps } from "./dispatch.js";
import type { BlockOperation } from "./types.js";

/**
 * The groups of `dispatchSteps`, with the Yjs 14 binding of
 * `@blocknote/core/y`. In each test, an editor that is bound to a Y.Doc gets
 * the operations of a write, and another replica changes the document at the
 * same time. Then the two replicas sync. The change of the other replica
 * must be in its block.
 *
 * The tests run in the two ways to dispatch a write: in the groups of
 * `dispatchSteps`, and in one transaction. With one transaction, the binding
 * writes a change into the wrong block in four cases (`it.fails`): it pairs
 * the changed nodes of a list by their type, not by their block ID (see
 * `stepGroupEnds`). If these tests pass (thus `it.fails` reports them), the
 * binding pairs the blocks correctly, and the groups can go.
 */

const reader = BlockNoteEditor.create();

const text = (value: string) => [
  { type: "text" as const, text: value, styles: {} },
];

function paragraph(id: string, value: string) {
  return {
    id,
    type: "paragraph",
    props: {},
    content: text(value),
    children: [],
  };
}

/** Types `value` after the first occurrence of `after`, as a user of the editor. */
function typeAfter(
  editor: BlockNoteEditor<any, any, any>,
  after: string,
  value: string,
) {
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

const ways = ["the groups of dispatchSteps", "one transaction"] as const;
type Way = (typeof ways)[number];

/**
 * A write of the operations to a bound editor, while another replica types
 * `typed` after the text `after`. Returns the ID, the type and the text of
 * each block after the sync of the two replicas.
 */
function write(
  way: Way,
  blocks: PartialBlock[],
  operations: BlockOperation[],
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

  const tr = editor.prosemirrorState.tr;
  applyOperations(tr, operations);
  if (way === "one transaction") {
    editor.transact((transaction) => {
      for (const step of tr.steps) {
        transaction.step(step);
      }
    });
  } else {
    dispatchSteps(editor, tr);
  }

  Y.applyUpdate(ydoc, Y.encodeStateAsUpdate(other, Y.encodeStateVector(ydoc)));
  Y.applyUpdate(other, Y.encodeStateAsUpdate(ydoc, Y.encodeStateVector(other)));
  expect(yDocToBlocks(reader, other)).toEqual(yDocToBlocks(reader, ydoc));
  return yDocToBlocks(reader, ydoc).map((block) => [
    block.id,
    block.type,
    (block.content as { text: string }[])[0]?.text,
  ]);
}

const three: PartialBlock[] = [
  { id: "a", type: "paragraph", content: "Alpha" },
  { id: "b", type: "paragraph", content: "Beta" },
  { id: "c", type: "paragraph", content: "Gamma" },
];

describe.each(ways)(
  "a write to an editor that is bound with the Yjs 14 binding (%s)",
  (way) => {
    /** A case in which one transaction puts the change of the other replica into the wrong block. */
    const itNeedsGroups = way === "one transaction" ? it.fails : it;

    itNeedsGroups(
      "keeps a change of another replica in a block, with an insert before that block",
      () => {
        expect(
          write(
            way,
            three,
            [
              {
                type: "update",
                id: "b",
                update: { content: text("Changed Beta") },
              },
              {
                type: "insert",
                block: paragraph("new", "New"),
                reference: "a",
                placement: "after",
              },
            ],
            ["Beta", "!"],
          ),
        ).toEqual([
          ["a", "paragraph", "Alpha"],
          ["new", "paragraph", "New"],
          ["b", "paragraph", "Changed Beta!"],
          ["c", "paragraph", "Gamma"],
        ]);
      },
    );

    itNeedsGroups(
      "keeps a change of another replica in a block, with a removal before that block",
      () => {
        expect(
          write(
            way,
            three,
            [
              {
                type: "update",
                id: "b",
                update: { content: text("Changed Beta") },
              },
              { type: "delete", id: "a" },
            ],
            ["Beta", "!"],
          ),
        ).toEqual([
          ["b", "paragraph", "Changed Beta!"],
          ["c", "paragraph", "Gamma"],
        ]);
      },
    );

    itNeedsGroups(
      "does not put a change of another replica to a removed block into the new block at its place",
      () => {
        expect(
          write(
            way,
            three,
            [
              {
                type: "insert",
                block: paragraph("new", "New"),
                reference: "b",
                placement: "after",
              },
              { type: "delete", id: "b" },
            ],
            ["Beta", "!"],
          ),
        ).toEqual([
          ["a", "paragraph", "Alpha"],
          ["new", "paragraph", "New"],
          ["c", "paragraph", "Gamma"],
        ]);
      },
    );

    itNeedsGroups(
      "keeps a change of another replica in a block, with a type change of the block before it",
      () => {
        expect(
          write(
            way,
            three,
            [
              { type: "update", id: "a", update: { type: "heading" } },
              {
                type: "update",
                id: "b",
                update: { content: text("Changed Beta") },
              },
            ],
            ["Beta", "!"],
          ),
        ).toEqual([
          ["a", "heading", "Alpha"],
          ["b", "paragraph", "Changed Beta!"],
          ["c", "paragraph", "Gamma"],
        ]);
      },
    );

    it("keeps a change of another replica in a block, with inserts at the start and at the end of the list", () => {
      expect(
        write(
          way,
          three,
          [
            {
              type: "insert",
              block: paragraph("first", "First"),
              placement: "start",
            },
            {
              type: "insert",
              block: paragraph("last", "Last"),
              reference: "c",
              placement: "after",
            },
          ],
          ["Alpha", " of the other replica"],
        ),
      ).toEqual([
        ["first", "paragraph", "First"],
        ["a", "paragraph", "Alpha of the other replica"],
        ["b", "paragraph", "Beta"],
        ["c", "paragraph", "Gamma"],
        ["last", "paragraph", "Last"],
      ]);
    });

    it("keeps a change of another replica between two changes in one paragraph", () => {
      expect(
        write(
          way,
          [
            {
              id: "p",
              type: "paragraph",
              content: "Alpha one two three Omega",
            },
          ],
          [
            {
              type: "update",
              id: "p",
              update: { content: text("First one two three Last") },
            },
          ],
          ["tw", "X"],
        ),
      ).toEqual([["p", "paragraph", "First one twXo three Last"]]);
    });

    it("keeps a change of another replica in a block, with text changes of two adjacent blocks", () => {
      expect(
        write(
          way,
          three,
          [
            {
              type: "update",
              id: "a",
              update: { content: text("Changed Alpha") },
            },
            {
              type: "update",
              id: "b",
              update: { content: text("Changed Beta") },
            },
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
        write(
          way,
          three,
          [{ type: "move", id: "c", placement: "start" }],
          ["Beta", "!"],
        ),
      ).toEqual([
        ["c", "paragraph", "Gamma"],
        ["a", "paragraph", "Alpha"],
        ["b", "paragraph", "Beta!"],
      ]);
    });
  },
);
