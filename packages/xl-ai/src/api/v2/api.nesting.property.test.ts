import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import {
  computeOperations,
  getDocumentText,
  htmlFormat,
  markdownFormat,
  type TextFormat,
  updateDocument,
} from "./index.js";
import type { LensBlock } from "./model.js";
import { flattenBlocks } from "./util/blocks/flatten.js";
import { canonicalText } from "./testUtil/canonical.js";
import { createRandom } from "./testUtil/random.js";
import {
  actualParents,
  EDIT_KINDS,
  type EditKind,
  expectedParents,
  type NestedDocumentOptions,
  nestingShape,
  randomNestedDocument,
  randomTreeEdit,
  tokenOf,
  type TreeEdit,
} from "./testUtil/nestedRandom.js";
import { valid } from "./testUtil/valid.js";

/**
 * Property tests of the nesting that a text shows, on random documents with
 * nested lists (see `testUtil/nestedRandom.ts`). Each case makes one random
 * edit of the nesting in the text (an indent, an outdent, a change of the
 * type, a swap, an insert, a removal, a move into a different list item, a
 * change of the text, or the removal of a list item without the blocks in
 * it). The edit changes the view (the parse of the text), and the text is
 * the serialize of the changed view. Then the case examines:
 *
 * - The laws: GetPut, PutGet (modulo the normalization of the format) and
 *   PutTwice, without warnings.
 * - The nesting that the text shows is the nesting of the result: the parse
 *   of the text and the parse of the next read have the same nesting.
 * - The model of the result (`expectedParents`): the block that the edit
 *   moves gets the parent that the text gives it. Each other block keeps its
 *   parent, also if the format does not show that nesting. Each block keeps
 *   its ID.
 *
 * Each case has a seed. To examine a failed case, run its seed again.
 */

const SEEDS = Array.from({ length: 25 }, (_, i) => i + 1);
/** The seeds of a known problem: one test runs them all, and fails at the first seed with the problem. */
const KNOWN_SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);

/** The documents with only the nesting that markdown shows: only list items have children. */
const VISIBLE: NestedDocumentOptions = { hidden: false };
/** The documents with nesting that markdown does not show: paragraphs, headings and quotes with children. */
const HIDDEN: NestedDocumentOptions = { hidden: true };
/** The documents with only the nesting that HTML shows: list items with only list items as children. */
const LISTS_ONLY: NestedDocumentOptions = {
  hidden: false,
  listChildrenOnly: true,
};

type Write = {
  editor: BlockNoteEditor<any, any, any>;
  /** The document before the write. */
  source: LensBlock[];
  edit: TreeEdit;
  /** The text that the client writes. */
  edited: string;
};

/** Makes a random document, and writes a random edit of the kind `kind` of its text. */
function writeRandomEdit(
  seed: number,
  format: TextFormat,
  options: NestedDocumentOptions,
  kind: EditKind,
): Write | undefined {
  const random = createRandom(seed * 7907 + kind.length);
  const editor = BlockNoteEditor.create({
    initialContent: randomNestedDocument(random, options),
  });
  const source = editor.document as LensBlock[];
  const text = getDocumentText(editor, format);

  // GetPut.
  expect(
    valid(computeOperations(editor, { base: "current", format, text }))
      .operations,
  ).toEqual([]);

  const changed = randomTreeEdit(random, format.parse(editor, text), kind);
  if (changed === undefined) {
    // The document has no block for this kind of edit.
    return undefined;
  }
  const edited = format.serialize(editor, changed.blocks);
  const update = valid(
    updateDocument(editor, { base: "current", format, text: edited }),
  );
  expect(update.warnings).toEqual([]);
  return { editor, source, edit: changed.edit, edited };
}

/** Examines PutGet, PutTwice, and that the result shows the nesting of the text. */
function expectLaws(format: TextFormat, { editor, edited }: Write) {
  const read = getDocumentText(editor, format);
  // PutGet, modulo the normalization of the format.
  expect(canonicalText(editor, format, read)).toBe(
    canonicalText(editor, format, edited),
  );
  // The nesting that the text shows is the nesting of the result.
  expect(nestingShape(format.parse(editor, read))).toBe(
    nestingShape(format.parse(editor, edited)),
  );
  // PutTwice.
  expect(
    valid(computeOperations(editor, { base: "current", format, text: edited }))
      .operations,
  ).toEqual([]);
}

/**
 * Returns the differences from the model of the result: the blocks with a
 * different parent, and the kept blocks with a different ID. An empty list
 * if the result agrees with the model.
 */
function modelErrors({ editor, source, edit }: Write): string[] {
  const expected = expectedParents(source, edit);
  const result = editor.document as LensBlock[];
  const actual = actualParents(result, expected);
  const idOf = (blocks: LensBlock[]) =>
    new Map(
      flattenBlocks(blocks).map(({ block }) => [tokenOf(block), block.id]),
    );
  const sourceIds = idOf(source);
  const resultIds = idOf(result);
  return [...expected].flatMap(([token, parent]) => [
    ...(actual.get(token) === parent
      ? []
      : [`${token}: parent ${parent}, got ${actual.get(token)}`]),
    ...(resultIds.get(token) === sourceIds.get(token)
      ? []
      : [`${token}: a new ID`]),
  ]);
}

/** Runs the model on all seeds, and fails at the first seed with a difference. */
function expectModelOnAllSeeds(
  format: TextFormat,
  options: NestedDocumentOptions,
  kind: EditKind,
) {
  for (const seed of KNOWN_SEEDS) {
    const write = writeRandomEdit(seed, format, options, kind);
    if (write !== undefined) {
      expect({ seed, errors: modelErrors(write) }).toEqual({
        seed,
        errors: [],
      });
    }
  }
}

describe("markdown, with only the nesting that markdown shows", () => {
  describe.each(EDIT_KINDS)("edit: %s", (kind) => {
    it.each(SEEDS)("keeps the laws and the model for seed %i", (seed) => {
      const write = writeRandomEdit(seed, markdownFormat, VISIBLE, kind);
      if (write !== undefined) {
        expectLaws(markdownFormat, write);
        expect(modelErrors(write)).toEqual([]);
      }
    });
  });
});

describe("markdown, with nesting that markdown does not show", () => {
  describe.each(EDIT_KINDS)("edit: %s", (kind) => {
    it.each(SEEDS)("keeps the laws for seed %i", (seed) => {
      const write = writeRandomEdit(seed, markdownFormat, HIDDEN, kind);
      if (write !== undefined) {
        expectLaws(markdownFormat, write);
      }
    });
  });

  // A change of the type of a list item: before `parentMovedAlong`, a
  // block kept its hidden parent only if its text parent kept its type.
  // The text parent of a hidden child of a paragraph in a list item is the
  // list item. Thus, the hidden child went out of the paragraph, into the
  // list item.
  //
  // A swap and a move: before the list rule (`listParent`, and a moved
  // block near its open source parent in `isNearHiddenAncestor`), a moved
  // block kept its hidden nesting only near a hidden ancestor that the
  // format does not render. Thus, a moved block left a visible parent that
  // the format does not show as its parent (for example a paragraph with a
  // list in it).
  describe.each([
    "indent",
    "insert",
    "remove",
    "text",
    "type",
    "swap",
    "moveTo",
  ] as const)("edit: %s", (kind) => {
    it.each(SEEDS)("keeps the model for seed %i", (seed) => {
      const write = writeRandomEdit(seed, markdownFormat, HIDDEN, kind);
      if (write !== undefined) {
        expect(modelErrors(write)).toEqual([]);
      }
    });
  });

  // An outdent and a lift: the list rule applies only to list items of one
  // list. A block that the text does not show in the list of the block
  // before it (a paragraph, a code block, a table, or a list item of a
  // different list) keeps the other rules: it goes into the parent of the
  // text, also if a hidden parent is open and the next block needs it.
  // Thus, the block closes that hidden parent, and the next blocks of the
  // hidden parent go out of it.
  it.fails("KNOWN: keeps the model for an outdent", () => {
    expectModelOnAllSeeds(markdownFormat, HIDDEN, "outdent");
  });
  it.fails("KNOWN: keeps the model for a removal of a list item without the blocks in it", () => {
    expectModelOnAllSeeds(markdownFormat, HIDDEN, "lift");
  });
});

describe("HTML, list items with only list items as children", () => {
  describe.each(EDIT_KINDS)("edit: %s", (kind) => {
    it.each(SEEDS)("keeps the laws and the model for seed %i", (seed) => {
      const write = writeRandomEdit(seed, htmlFormat, LISTS_ONLY, kind);
      if (write !== undefined) {
        expectLaws(htmlFormat, write);
        expect(modelErrors(write)).toEqual([]);
      }
    });
  });
});

describe("HTML, list items with other blocks as children", () => {
  // The HTML parse ignores `data-nesting-level` (README, "Problems in
  // BlockNote"). Thus, HTML hides the children of a list item from its
  // first child that is not a list item. Before the list rule, a new list
  // item after a list item went into the nesting of the next kept block:
  // before a hidden child of a list item, thus into that list item, where
  // HTML shows it. Now it goes into the parent of the list of the item
  // before it.
  it.each(SEEDS)("keeps the laws for an insert, for seed %i", (seed) => {
    const write = writeRandomEdit(seed, htmlFormat, VISIBLE, "insert");
    if (write !== undefined) {
      expectLaws(htmlFormat, write);
    }
  });
});

/** The moves of a tree edit: the block, and its new parent in the document of the edit. */
function moveOf(
  edit: TreeEdit,
  parents: ReadonlyMap<string, string | null>,
): { token: string; parent: string | null } | undefined {
  switch (edit.kind) {
    case "move":
      return {
        token: edit.token,
        parent:
          edit.after === undefined
            ? edit.parent
            : (parents.get(edit.after) ?? null),
      };
    case "moveAfter":
      return { token: edit.token, parent: parents.get(edit.sibling) ?? null };
    default:
      return undefined;
  }
}

/** The tokens of a block and of the blocks in it. */
function subtreeTokens(blocks: readonly LensBlock[], token: string): string[] {
  for (const block of blocks) {
    if (tokenOf(block) === token) {
      return flattenBlocks([block])
        .map(({ block: inner }) => tokenOf(inner))
        .filter((inner): inner is string => inner !== undefined);
    }
    const inChildren = subtreeTokens(block.children, token);
    if (inChildren.length > 0) {
      return inChildren;
    }
  }
  return [];
}

describe.each([
  { name: "markdown", format: markdownFormat, options: VISIBLE },
  { name: "HTML", format: htmlFormat, options: LISTS_ONLY },
])("concurrent moves of list items ($name)", ({ format, options }) => {
  const moves = ["indent", "outdent", "moveTo"] as const;

  it.each(SEEDS)(
    "keeps the moves of both writers, and No revert, for seed %i",
    (seed) => {
      const random = createRandom(seed * 7919);
      const editor = BlockNoteEditor.create({
        initialContent: randomNestedDocument(random, options),
      });
      const base = editor.document as LensBlock[];
      const baseText = getDocumentText(editor, format);
      const view = format.parse(editor, baseText);
      const theirs = randomTreeEdit(random, view, random.pick(moves));
      const ours = randomTreeEdit(random, view, random.pick(moves));
      if (theirs === undefined || ours === undefined) {
        return;
      }

      // Another writer writes its edit, then the client writes its edit
      // from `base`.
      valid(
        updateDocument(editor, {
          base: "current",
          format,
          text: format.serialize(editor, theirs.blocks),
        }),
      );
      const afterTheirs = editor.document as LensBlock[];
      const update = valid(
        updateDocument(editor, {
          base,
          format,
          text: format.serialize(editor, ours.blocks),
        }),
      );
      const result = editor.document as LensBlock[];

      // Each ID identifies one block.
      const ids = flattenBlocks(result).map(({ block }) => block.id);
      expect(new Set(ids).size).toBe(ids.length);
      // No revert.
      expect(
        valid(computeOperations(editor, { base, format, text: baseText }))
          .operations,
      ).toEqual([]);

      // Both moves stay, if they move different blocks and do not make a
      // cycle (then the parent of `theirs` stays, with a warning).
      const baseParents = expectedParents(base, {
        kind: "text",
        token: "",
      });
      const theirMove = moveOf(theirs.edit, baseParents);
      const ourMove = moveOf(ours.edit, baseParents);
      if (
        theirMove === undefined ||
        ourMove === undefined ||
        theirMove.token === ourMove.token ||
        subtreeTokens(base, theirMove.token).includes(ourMove.parent ?? "") ||
        subtreeTokens(base, ourMove.token).includes(theirMove.parent ?? "")
      ) {
        return;
      }
      const resultParents = actualParents(result, baseParents);
      expect(resultParents.get(ourMove.token)).toBe(ourMove.parent);
      expect(resultParents.get(theirMove.token)).toBe(
        actualParents(afterTheirs, baseParents).get(theirMove.token),
      );
      expect(update.warnings).toEqual([]);
    },
  );
});
