import { BlockNoteEditor } from "@blocknote/core";
import { describe, expect, it } from "vite-plus/test";

import type { FlatBlock, LensBlock } from "../model.js";
import { htmlFormat } from "../formats/html.js";
import { markdownFormat } from "../formats/markdown.js";
import { plainTextFormat } from "../formats/plainText.js";
import type { TextFormat } from "../formats/types.js";
import { flattenBlocks, schemaRulesOf } from "../util/blocks/index.js";
import { createRandom } from "../testUtil/random.js";
import { randomRichDocument, richSchema } from "../testUtil/richRandom.js";
import {
  projectDocument,
  projectWithParts,
  roundTripAlone,
} from "./projectDocument.js";

/**
 * The definition of the parts: one round trip for each block alone, without
 * the two shortcuts of `partsOf`. A layout block (for example a column) is
 * its own part: alone, the parse would fill it with new blocks.
 */
function partsOfEachBlock(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  sources: readonly FlatBlock[],
  text: string,
): { part: FlatBlock; sourceIndex: number }[] {
  const { layoutRuleOf } = schemaRulesOf(editor);
  return sources.flatMap((flat, sourceIndex) => {
    if (layoutRuleOf(flat.block.type) !== undefined) {
      return [{ part: { ...flat, parentIndex: undefined }, sourceIndex }];
    }
    const [own] = roundTripAlone(editor, format, [flat.block], text);
    return own.map((part) => ({ part, sourceIndex }));
  });
}

/**
 * The two shortcuts of `partsOf` need properties of the format (see its doc
 * comment). This test compares the projection with the projection of the
 * definition, on random documents with all kinds of blocks (see
 * `randomRichDocument`). A view block without a link throws in
 * `projectDocument` (the format contract).
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
      "gives the same parts as one round trip for each block, for seed %i",
      (seed) => {
        // The same seed as in `api.fuzz.test.ts` gives the same document.
        const random = createRandom(seed * 7919 + name.length);
        const editor = BlockNoteEditor.create({
          schema: richSchema,
          initialContent: randomRichDocument(random),
        });
        const document = editor.document as LensBlock[];
        const text = format.serialize(editor, document);

        const projection = projectDocument(editor, format, document, text);
        const sources = flattenBlocks(document);
        expect(projection).toEqual(
          projectWithParts(
            sources,
            projection.view,
            partsOfEachBlock(editor, format, sources, text),
          ),
        );
      },
    );
  },
);
