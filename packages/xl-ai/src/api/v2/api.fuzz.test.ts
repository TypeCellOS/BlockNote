import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { alignmentKey } from "./alignment/alignBlocks.js";
import { flattenBlocks } from "./blocks/flatten.js";
import { schemaRulesOf } from "./blocks/schema.js";
import { blockToText } from "./blocks/text.js";
import type { LensBlock } from "./blocks/types.js";
import { toStoredBlocks } from "./formats/stored.js";
import {
  computeTextUpdate,
  getDocumentText,
  htmlFormat,
  markdownFormat,
  plainTextFormat,
  type TextFormat,
  updateDocumentFromText,
} from "./index.js";
import { projectDocument, shownBlocks } from "./projection/projectDocument.js";
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
        // A block that the view shows as it is makes no round trip alone.
        // Thus, alone, it must give the same block (see `shownBlocks`). A
        // layout block never makes the round trip.
        const sources = flattenBlocks(document);
        const { layoutRuleOf } = schemaRulesOf(editor);
        for (const source of shownBlocks(sources, projection.view)) {
          const { block } = sources[source];
          if (layoutRuleOf(block.type) !== undefined) {
            continue;
          }
          const alone = toStoredBlocks(
            editor,
            format.parse(editor, format.serialize(editor, [block])),
          );
          expect(
            flattenBlocks(alone ?? []).map((part) => alignmentKey(part.block)),
          ).toEqual([alignmentKey(block)]);
        }

        // GetPut.
        const getPut = computeTextUpdate(editor, {
          base: "current",
          format,
          text,
        });
        expect(getPut.error === undefined ? getPut.operations : getPut).toEqual(
          [],
        );

        const edited = randomEdits(random, text, randomTextEdit);
        const update = updateDocumentFromText(editor, {
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
        const twice = computeTextUpdate(editor, {
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
