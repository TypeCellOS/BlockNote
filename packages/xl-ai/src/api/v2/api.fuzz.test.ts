import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { flattenBlocks } from "./util/blocks/flatten.js";
import type { LensBlock } from "./model.js";
import {
  getDocumentText,
  htmlFormat,
  markdownFormat,
  plainTextFormat,
  type TextFormat,
  updateDocument,
} from "./index.js";
import { canonicalText } from "./testUtil/canonical.js";
import { textStages } from "./testUtil/stages.js";
import { createRandom, randomEdits } from "./testUtil/random.js";
import {
  randomRichDocument,
  randomTextEdit,
  richSchema,
} from "./testUtil/richRandom.js";

/**
 * The laws on random documents with all kinds of blocks (see
 * `randomRichDocument`), with random edits of characters, lines and blocks.
 * `projection/projectDocument.fuzz.test.ts` examines the projection of the
 * same documents.
 */
const SEEDS = Array.from({ length: 150 }, (_, i) => i + 1);

describe.each([
  { name: "markdown", format: markdownFormat },
  { name: "HTML", format: htmlFormat },
  { name: "plain text", format: plainTextFormat },
] satisfies { name: string; format: TextFormat }[])(
  "random documents with all kinds of blocks ($name)",
  ({ name, format }) => {
    it.each(SEEDS)("keeps the laws for seed %i", (seed) => {
      const random = createRandom(seed * 7919 + name.length);
      const editor = BlockNoteEditor.create({
        schema: richSchema,
        initialContent: randomRichDocument(random),
      });
      const text = getDocumentText(editor, format);

      // GetPut.
      expect(textStages(editor, format, text).operations).toEqual([]);

      const edited = randomEdits(random, text, randomTextEdit);
      const update = updateDocument(editor, {
        base: "current",
        format,
        text: edited,
      });
      if (update.error !== undefined) {
        // A random edit of HTML markup can give HTML that does not fit the
        // schema. That is an expected error.
        expect(update.error).toBe("invalid-document");
        return;
      }

      // Each ID identifies one block.
      const ids = flattenBlocks(editor.document as LensBlock[]).map(
        ({ block }) => block.id,
      );
      expect(new Set(ids).size).toBe(ids.length);
      // PutGet, modulo the normalization of the format.
      expect(
        canonicalText(editor, format, getDocumentText(editor, format)),
      ).toBe(canonicalText(editor, format, edited));
      // PutTwice.
      expect(textStages(editor, format, edited).operations).toEqual([]);
    });
  },
);
