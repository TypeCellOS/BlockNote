import type { BlockNoteEditor } from "@blocknote/core";

import { parseAndAlign, targetInputOf, updateFromTarget } from "../api.js";
import { schemaRulesOf } from "../util/blocks/schema.js";
import { blockToText } from "../util/blocks/text.js";
import type { BlockWithoutChildren, FlatBlock, LensBlock } from "../model.js";
import type { TextFormat } from "../formats/types.js";
import { projectDocument } from "../projection/projectDocument.js";
import { targetFromPairs } from "../target/targetFromPairs.js";
import type { ViewBlock } from "../projection/projectDocument.js";

/**
 * Runs the stages of a text write on the current document (`base:
 * "current"`), and returns the data of each stage in a short form. Each row
 * is one block: its ID (or the source ID of a view block), its type and its
 * text.
 *
 * It calls the stage functions of `textTarget` and `operationsOf` in
 * `api.ts`, in the same order. The text must differ from the text of the
 * document (an unchanged text has no stages).
 */
export function textStages(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  text: string,
) {
  const document = editor.document as LensBlock[];
  // 1. Project.
  const projection = projectDocument(editor, format, document);
  // 2. Parse and align.
  const { textBlocks, pairs } = alignedOrThrow(
    parseAndAlign(editor, format, projection.view, text),
  );
  // 3. Target.
  const input = targetInputOf(editor, format, document, projection, {
    textBlocks,
    pairs,
  });
  const target = targetFromPairs(input);
  // 4. Merge (none for `base: "current"`), 5. Fit and 6. Diff.
  const update = updateFromTarget(schemaRulesOf(editor), target, {
    base: undefined,
    current: document,
    onConflict: undefined,
  });
  if (update.error !== undefined) {
    throw new Error(`The update is an error: ${update.error}`);
  }

  const short = (block: BlockWithoutChildren, id = block.id) => [
    id,
    block.type,
    blockToText(block),
  ];
  return {
    /** Each view block, with the link of its parent in the view (if it has one). */
    view: projection.view.map(({ block, sourceId, parentIndex }) => {
      const parent =
        parentIndex === undefined
          ? []
          : [`in ${projection.view[parentIndex].sourceId}`];
      return [...short(block, sourceId), ...parent];
    }),
    invisible: [...projection.invisibleIds],
    pairs: pairs.map(({ aIndex, bIndex }) => [
      blockToText(projection.view[aIndex].block),
      blockToText(textBlocks[bIndex].block),
    ]),
    operations: withNewIdPlaceholders(update.operations),
    warnings: target.warnings,
  };
}

/** Returns the alignment, and fails the test if the text does not fit the schema. */
function alignedOrThrow<T>(
  aligned: ({ error?: undefined } & T) | { error: string },
): T {
  if (aligned.error !== undefined) {
    throw new Error(`The text is an error: ${aligned.error}`);
  }
  return aligned;
}

/**
 * Returns the operations with the placeholder "(new)" for each new ID. New
 * IDs are random. The tests give the document IDs of lower-case letters only.
 */
export function withNewIdPlaceholders(
  operations: readonly unknown[],
): unknown[] {
  return JSON.parse(
    JSON.stringify(operations).replace(
      /"id":"(?![a-z]+")[^"]+"/g,
      '"id":"(new)"',
    ),
  );
}

/**
 * The text blocks of a text, as `textTarget` in `api.ts` gives them (see
 * `parseAndAlign`): the parse, checked (see `assertBlocksRoundTrip`), in a
 * flat list.
 */
export function textBlocksOf(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  text: string,
  view: readonly ViewBlock[],
): FlatBlock[] {
  return alignedOrThrow(parseAndAlign(editor, format, view, text)).textBlocks;
}
