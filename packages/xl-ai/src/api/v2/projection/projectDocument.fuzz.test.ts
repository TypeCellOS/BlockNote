import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import { alignmentKey } from "../alignment/index.js";
import type { FlatBlock, LensBlock } from "../model.js";
import { htmlFormat } from "../formats/html.js";
import { markdownFormat } from "../formats/markdown.js";
import { plainTextFormat } from "../formats/plainText.js";
import type { TextFormat } from "../formats/types.js";
import { flattenBlocks, schemaRulesOf } from "../util/blocks/index.js";
import { createRandom } from "../testUtil/random.js";
import { randomRichDocument, richSchema } from "../testUtil/richRandom.js";
import { projectDocument, roundTripIsolated } from "./projectDocument.js";

/**
 * The simple version of `sourcesOfView` (in `projectDocument.ts`): the
 * isolated round trip of each source block, one block at a time, without the
 * two shortcuts. Returns the view blocks that the source blocks give, in
 * document order, each with the index of its source block. A layout block
 * gets no round trip (isolated, the parse would fill it with new blocks): it
 * gives itself if the view has a block with its key.
 */
function isolatedResults(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  sources: readonly FlatBlock[],
  view: readonly FlatBlock[],
  text: string,
): { sourceIndex: number; flat: FlatBlock }[] {
  const { layoutRuleOf } = schemaRulesOf(editor);
  const viewKeys = new Set(view.map(({ block }) => alignmentKey(block)));
  return sources.flatMap((source, sourceIndex) => {
    if (layoutRuleOf(source.block.type) !== undefined) {
      return viewKeys.has(alignmentKey(source.block))
        ? [{ sourceIndex, flat: source }]
        : [];
    }
    const [result] = roundTripIsolated(editor, format, [source.block], text);
    return result.map((flat) => ({ sourceIndex, flat }));
  });
}

/**
 * The format contract and the two shortcuts of `sourcesOfView`, on random
 * documents with all kinds of blocks (see `randomRichDocument`).
 */
const SEEDS = Array.from({ length: 150 }, (_, i) => i + 1);

describe.each([
  { name: "markdown", format: markdownFormat },
  { name: "HTML", format: htmlFormat },
  { name: "plain text", format: plainTextFormat },
] satisfies { name: string; format: TextFormat }[])(
  "the projection of random documents with all kinds of blocks ($name)",
  ({ name, format }) => {
    it.each(SEEDS)(
      "links each view block to the source block that gives it, for seed %i",
      (seed) => {
        // The same seed as in `api.fuzz.test.ts` gives the same document.
        const random = createRandom(seed * 7919 + name.length);
        const editor = BlockNoteEditor.create({
          schema: richSchema,
          initialContent: randomRichDocument(random),
        });
        const document = editor.document as LensBlock[];
        const text = format.serialize(editor, document);
        const sources = flattenBlocks(document);

        const projection = projectDocument(editor, format, document, text);
        const results = isolatedResults(
          editor,
          format,
          sources,
          projection.view,
          text,
        );
        // The format contract: the view is the isolated results of the
        // source blocks, in document order.
        expect(projection.view.map(({ block }) => alignmentKey(block))).toEqual(
          results.map(({ flat }) => alignmentKey(flat.block)),
        );
        // The shortcuts give the same links as the simple version.
        expect(projection.view.map(({ sourceId }) => sourceId)).toEqual(
          results.map(({ sourceIndex }) => sources[sourceIndex].block.id),
        );
      },
    );
  },
);
