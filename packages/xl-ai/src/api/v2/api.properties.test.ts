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
import { createRandom, randomDocument, randomEdit } from "./testUtil/random.js";

/**
 * Property tests: the laws (see `api.laws.test.ts`) on random documents with
 * random edits. Each case has a seed. To examine a failed case, run its seed
 * again.
 */

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);

const formats = [
  { name: "markdown", format: markdownFormat },
  { name: "plain text", format: plainTextFormat },
  { name: "HTML", format: htmlFormat },
];

describe.each(formats)("$name", ({ format }) => {
  it.each(SEEDS)("keeps the laws for seed %i", (seed) => {
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
    expect(canonicalText(editor, format, getDocumentText(editor, format))).toBe(
      canonicalText(editor, format, edited),
    );

    // PutTwice.
    expect(
      computeTextUpdate(editor, { format, text: edited }).operations,
    ).toEqual([]);
  });

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
