import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import {
  computeTextUpdate,
  getDocumentText,
  markdownFormat,
  plainTextFormat,
  updateDocumentFromText,
} from "./index.js";
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
});
