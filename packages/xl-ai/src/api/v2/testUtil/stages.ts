import type { BlockNoteEditor } from "@blocknote/core";
import { UniqueID } from "@blocknote/core/extensions";

import { alignBlocks } from "../alignment/alignBlocks.js";
import { schemaRulesOf } from "../blocks/schema.js";
import { BlockTree } from "../blocks/tree.js";
import { blockToText } from "../blocks/text.js";
import type { FlatBlock, LensBlock } from "../blocks/types.js";
import { flattenBlocks } from "../blocks/flatten.js";
import { fitResult } from "../fit/fitResult.js";
import type { TextFormat } from "../formats/types.js";
import { diffDocuments } from "../operations/diffDocuments.js";
import { parseText } from "../parse/parseText.js";
import { checkFormatShows } from "../projection/formatCheck.js";
import { correspond } from "../plan/correspond.js";
import { planTarget } from "../plan/planTarget.js";
import {
  projectDocument,
  type ViewBlock,
} from "../projection/projectDocument.js";
import { shadowsOf } from "../projection/shadows.js";

/**
 * Runs the stages of a text write on the current document (`base:
 * "current"`), as `planText` and `updateFromPlan` in `api.ts` do, and returns
 * the data of each stage in a short form. Each row is one block: its ID (or
 * the source ID of a view block), its type and its text.
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
  const textBlocks = textBlocksOf(editor, format, text, projection.view);
  const pairs = alignBlocks(projection.view, textBlocks);
  // 3. Plan.
  const input = {
    document,
    projection,
    incoming: textBlocks,
    alignment: pairs,
    contentKindOf: schemaRulesOf(editor).contentKindOf,
    shadowOf: shadowsOf(editor, format),
    newId: () => UniqueID.options.generateID(),
  };
  const { rows } = correspond(input, new BlockTree(document));
  const plan = planTarget(input);
  // 5. Fit, and 6. Diff (no merge for `base: "current"`).
  const result = fitResult(schemaRulesOf(editor), plan.target, document, false);
  const operations = diffDocuments(document, result);

  const short = (block: LensBlock, id = block.id) => [
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
          : [`in ${projection.view[parentIndex].sourceId ?? "(no link)"}`];
      return [...short(block, sourceId ?? "(no link)"), ...parent];
    }),
    invisible: [...projection.invisibleIds],
    pairs: pairs.map(({ aIndex, bIndex }) => [
      blockToText(projection.view[aIndex].block),
      blockToText(textBlocks[bIndex].block),
    ]),
    rows: rows.map((row, j) => [
      row.kind,
      row.kind === "skipped" ? undefined : row.id,
      blockToText(textBlocks[j].block),
    ]),
    operations: withNewIdPlaceholders(operations),
    warnings: plan.warnings,
  };
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
 * The text blocks of a text, as `planText` in `api.ts` gives them: the parse,
 * checked (see `checkFormatShows`), in a flat list.
 */
export function textBlocksOf(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  text: string,
  view: readonly ViewBlock[],
): FlatBlock[] {
  const parsed = parseText(editor, format, text);
  if (parsed.error !== undefined) {
    throw new Error(parsed.error);
  }
  checkFormatShows(editor, format, parsed.blocks, view, text);
  return flattenBlocks(parsed.blocks);
}
