import {
  BlockNoteEditor,
  BlockNoteSchema,
  defaultBlockSpecs,
} from "@blocknote/core";
import { withMultiColumn } from "@blocknote/xl-multi-column";
import { describe, expect, it } from "vite-plus/test";

import {
  computeTextUpdate,
  getDocumentText,
  markdownFormat,
  type TextFormat,
  updateDocumentFromText,
} from "./index.js";
import { flattenBlocks } from "./blocks/flatten.js";
import type { LensBlock } from "./blocks/types.js";
import { canonicalText } from "./testUtil/canonical.js";
import {
  createRandom,
  type Random,
  randomDocument,
  randomDocumentWithColumns,
  randomEdit,
  randomEdits,
  randomLineEdit,
} from "./testUtil/random.js";
import { type Codec, formatCases } from "./testUtil/codecs.js";
import { valid } from "./testUtil/valid.js";

/**
 * Property tests: the laws (see `api.laws.test.ts`) on random documents with
 * random edits. Each case has a seed. To examine a failed case, run its seed
 * again.
 */

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);
const LAW_SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
const LINE_EDIT_SEEDS = Array.from({ length: 400 }, (_, i) => i + 1000);
const COLUMN_SEEDS = Array.from({ length: 100 }, (_, i) => i + 1);

/**
 * HTML seeds that fail because of a known problem of core: the HTML parse
 * ignores `data-nesting-level`. Thus, HTML hides the nesting of the children
 * of a list item only if a child that is not a list item comes first. In
 * these seeds, the text puts a list item before such a hidden child, and the
 * list item goes into the same parent, where HTML shows it.
 */
const HTML_NESTING_SEEDS = { laws: [163], columns: [81] };

/**
 * Makes random edits to the text of the editor, writes the text back, and
 * examines GetPut, PutGet and PutTwice.
 */
function expectLaws(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  codec: Codec,
  random: Random,
) {
  const text = getDocumentText(editor, format);

  // GetPut, also without the shortcut for equal text.
  expect(
    valid(computeTextUpdate(editor, { format, text: `${text}\n` })).operations,
  ).toEqual([]);

  const edited = randomEdits(random, text, (random, text) =>
    randomEdit(random, text, codec),
  );
  const update = valid(
    updateDocumentFromText(editor, { format, text: edited }),
  );
  expect(update.warnings).toEqual([]);

  // PutGet, modulo the normalization of the format.
  expect(canonicalText(editor, format, getDocumentText(editor, format))).toBe(
    canonicalText(editor, format, edited),
  );

  // PutTwice.
  expect(
    valid(computeTextUpdate(editor, { format, text: edited })).operations,
  ).toEqual([]);
}

describe.each(formatCases)("$name", ({ name, format, codec }) => {
  const known = (seeds: number[]) => (name === "HTML" ? seeds : []);
  const lawSeeds = LAW_SEEDS.filter(
    (seed) => !known(HTML_NESTING_SEEDS.laws).includes(seed),
  );
  const columnSeeds = COLUMN_SEEDS.filter(
    (seed) => !known(HTML_NESTING_SEEDS.columns).includes(seed),
  );

  it.each(lawSeeds)("keeps the laws for seed %i", (seed) => {
    const random = createRandom(seed);
    const editor = BlockNoteEditor.create({
      initialContent: randomDocument(random),
    });
    expectLaws(editor, format, codec, random);
  });

  it.each(columnSeeds)(
    "keeps the laws for a document with columns, for seed %i",
    (seed) => {
      const random = createRandom(seed);
      const editor = BlockNoteEditor.create({
        schema: withMultiColumn(
          BlockNoteSchema.create({ blockSpecs: defaultBlockSpecs }),
        ),
        initialContent: randomDocumentWithColumns(random),
      });
      expectLaws(editor, format, codec, random);
    },
  );

  it.each(SEEDS)(
    "keeps all block IDs if the text swaps two paragraphs, for seed %i",
    (seed) => {
      const random = createRandom(seed);
      const editor = BlockNoteEditor.create({
        initialContent: randomDocument(random),
      });
      const parts = getDocumentText(editor, format).split("\n\n");
      // Simple paragraphs: one line that starts with a letter, with a text
      // that no other part has.
      const simple = (part: string | undefined) =>
        part !== undefined &&
        /^\p{L}[^\n]*$/u.test(part) &&
        parts.filter((other) => other === part).length === 1;
      const candidates = parts
        .map((_, index) => index)
        .filter((index) => simple(parts[index]) && simple(parts[index + 1]));
      if (candidates.length === 0) {
        return;
      }
      const index = random.pick(candidates);
      [parts[index], parts[index + 1]] = [parts[index + 1], parts[index]];
      const ids = () =>
        flattenBlocks(editor.document as LensBlock[])
          .map(({ block }) => block.id)
          .sort();
      const before = ids();

      valid(
        updateDocumentFromText(editor, { format, text: parts.join("\n\n") }),
      );

      expect(ids()).toEqual(before);
    },
  );
});

/**
 * The laws for edits that change the structure in markdown: the nesting of
 * list items, block types and checkboxes (see `randomLineEdit`).
 */
describe("markdown, edits of lines", () => {
  const format = markdownFormat;
  it.each(LINE_EDIT_SEEDS)("keeps the laws for seed %i", (seed) => {
    const random = createRandom(seed);
    const editor = BlockNoteEditor.create({
      initialContent: randomDocument(random),
    });
    const edited = randomEdits(
      random,
      getDocumentText(editor, format),
      randomLineEdit,
    );
    const update = valid(
      updateDocumentFromText(editor, { format, text: edited }),
    );
    expect(update.warnings).toEqual([]);

    // PutGet, modulo the normalization of the format.
    expect(canonicalText(editor, format, getDocumentText(editor, format))).toBe(
      canonicalText(editor, format, edited),
    );
    // PutTwice.
    expect(
      valid(computeTextUpdate(editor, { format, text: edited })).operations,
    ).toEqual([]);
  });
});
