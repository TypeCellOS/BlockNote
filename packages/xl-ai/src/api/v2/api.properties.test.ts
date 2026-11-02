import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import {
  computeTextUpdate,
  getDocumentText,
  htmlFormat,
  markdownFormat,
  plainTextFormat,
  updateDocumentFromText,
} from "./index.js";
import { flattenBlocks } from "./blocks/flatten.js";
import type { LensBlock } from "./blocks/types.js";
import { canonicalText } from "./testUtil/canonical.js";
import {
  createRandom,
  randomDocument,
  randomEdit,
  randomLineEdit,
} from "./testUtil/random.js";

/**
 * Property tests: the laws (see `api.laws.test.ts`) on random documents with
 * random edits. Each case has a seed. To examine a failed case, run its seed
 * again.
 */

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);
const LAW_SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
const LINE_EDIT_SEEDS = Array.from({ length: 400 }, (_, i) => i + 1000);

/**
 * Seeds that fail because of a problem in BlockNote, not in the lens: the
 * markdown parser moves a block after a nested list out of the list item
 * (see "Problems in BlockNote" in the README). These tests are marked as
 * known failures. When the problem is fixed, the tests fail, and tell you to
 * remove the marks.
 */
const PARSER_PROBLEMS = {
  laws: { markdown: [161] } as Record<string, number[]>,
  lineEdits: [1358],
};

/** Runs the test for each seed. The seeds in `known` must fail. */
function eachSeed(
  seeds: readonly number[],
  known: readonly number[],
  name: string,
  test: (seed: number) => void,
) {
  for (const seed of seeds) {
    if (known.includes(seed)) {
      it.fails(`${name} ${seed} (known problem in BlockNote)`, () =>
        test(seed));
    } else {
      it(`${name} ${seed}`, () => test(seed));
    }
  }
}

const formats = [
  { name: "markdown", format: markdownFormat },
  { name: "plain text", format: plainTextFormat },
  { name: "HTML", format: htmlFormat },
];

describe.each(formats)("$name", ({ name, format }) => {
  eachSeed(
    LAW_SEEDS,
    PARSER_PROBLEMS.laws[name] ?? [],
    "keeps the laws for seed",
    (seed) => {
      const random = createRandom(seed);
      const editor = BlockNoteEditor.create({
        initialContent: randomDocument(random),
      });
      const text = getDocumentText(editor, format);

      // GetPut, also without the shortcut for equal text.
      expect(
        computeTextUpdate(editor, { format, text: `${text}\n` }).operations,
      ).toEqual([]);

      let edited = text;
      for (let i = 0; i <= random.int(3); i++) {
        edited = randomEdit(random, edited);
      }
      const update = updateDocumentFromText(editor, { format, text: edited });
      expect(update.warnings).toEqual([]);

      // PutGet, modulo the normalization of the format.
      expect(
        canonicalText(editor, format, getDocumentText(editor, format)),
      ).toBe(canonicalText(editor, format, edited));

      // PutTwice.
      expect(
        computeTextUpdate(editor, { format, text: edited }).operations,
      ).toEqual([]);
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

      updateDocumentFromText(editor, { format, text: parts.join("\n\n") });

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
  eachSeed(
    LINE_EDIT_SEEDS,
    PARSER_PROBLEMS.lineEdits,
    "keeps the laws for seed",
    (seed) => {
      const random = createRandom(seed);
      const editor = BlockNoteEditor.create({
        initialContent: randomDocument(random),
      });
      let edited = getDocumentText(editor, format);
      for (let i = 0; i <= random.int(3); i++) {
        edited = randomLineEdit(random, edited);
      }
      const update = updateDocumentFromText(editor, { format, text: edited });
      expect(update.warnings).toEqual([]);

      // PutGet, modulo the normalization of the format.
      expect(
        canonicalText(editor, format, getDocumentText(editor, format)),
      ).toBe(canonicalText(editor, format, edited));
      // PutTwice.
      expect(
        computeTextUpdate(editor, { format, text: edited }).operations,
      ).toEqual([]);
    },
  );
});
