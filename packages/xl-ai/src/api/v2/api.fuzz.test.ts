import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { flattenBlocks } from "./blocks/flatten.js";
import { blockToText } from "./blocks/text.js";
import type { LensBlock } from "./blocks/types.js";
import {
  computeOperations,
  getDocumentText,
  htmlFormat,
  markdownFormat,
  plainTextFormat,
  type TextFormat,
  updateDocument,
} from "./index.js";
import {
  partsOfEachBlock,
  projectDocument,
  projectWithParts,
} from "./projection/projectDocument.js";
import { canonicalText } from "./testUtil/canonical.js";
import { createRandom, randomEdits } from "./testUtil/random.js";
import {
  randomRichDocument,
  randomTextEdit,
  richSchema,
} from "./testUtil/richRandom.js";

/**
 * The laws and the format contract on random documents with all kinds of
 * blocks (see `randomRichDocument`), with random edits of characters,
 * lines and blocks.
 */
const SEEDS = Array.from({ length: 150 }, (_, i) => i + 1);

describe.each([
  { name: "markdown", format: markdownFormat },
  { name: "HTML", format: htmlFormat },
  { name: "plain text", format: plainTextFormat },
] satisfies { name: string; format: TextFormat }[])(
  "random documents with all kinds of blocks ($name)",
  ({ name, format }) => {
    it.each(SEEDS)(
      "keeps the format contract and the laws for seed %i",
      (seed) => {
        const random = createRandom(seed * 7919 + name.length);
        const editor = BlockNoteEditor.create({
          schema: richSchema,
          initialContent: randomRichDocument(random),
        });
        const document = editor.document as LensBlock[];
        const text = getDocumentText(editor, format);

        // The format contract: each view block with text comes from one
        // document block. Thus, the round trip of the full document agrees
        // with the round trip of each block alone (see `projectDocument`).
        const projection = projectDocument(editor, format, document);
        const unlinked = projection.view
          .filter((v) => v.sourceId === undefined)
          .map((v) => blockToText(v.block))
          .filter((value) => value !== "");
        expect(unlinked).toEqual([]);
        // The optimizations of the parts (`partsOf`) give the same
        // projection as one round trip for each block (`partsOfEachBlock`).
        const sources = flattenBlocks(document);
        expect(projection).toEqual(
          projectWithParts(
            sources,
            projection.view,
            partsOfEachBlock(editor, format, sources, text),
          ),
        );

        // GetPut.
        const getPut = computeOperations(editor, {
          base: "current",
          format,
          text,
        });
        expect(getPut.error === undefined ? getPut.operations : getPut).toEqual(
          [],
        );

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
        const twice = computeOperations(editor, {
          base: "current",
          format,
          text: edited,
        });
        expect(twice.error === undefined ? twice.operations : twice).toEqual(
          [],
        );
      },
    );
  },
);
