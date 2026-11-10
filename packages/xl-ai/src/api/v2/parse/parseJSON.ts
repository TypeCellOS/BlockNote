import type { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { UniqueID } from "@blocknote/core/extensions";

import type { LensBlock } from "../model.js";
import { duplicateId } from "../util/blocks/index.js";
import { toStoredBlocks } from "../formats/index.js";

/**
 * Stage 2 for JSON: the blocks of the JSON of a client, in the form that the
 * document stores them (as `parseText` for a text).
 *
 * - If the blocks do not fit the schema, the result is the error
 *   `"invalid-document"`. This is also true for blocks that the conversion
 *   must fill: for example a column list with one column (the conversion
 *   adds an empty column), or an empty column. The client gives a valid
 *   document; the lens does not repair it.
 * - A table cell with a span above the limits of the HTML table model (see
 *   {@link spansFit}) also gives `"invalid-document"`. The conversion
 *   cannot convert such a table (a stack overflow in core).
 * - Two blocks with one ID also give `"invalid-document"`: an ID identifies
 *   one block. REVISIT: an earlier version gave the later block the ID with
 *   a number (`x-2`), as for the current document (see `assertBlockIds`).
 */
export function parseJSON(
  editor: BlockNoteEditor<any, any, any>,
  json: readonly PartialBlock<any, any, any>[],
): { error?: undefined; blocks: LensBlock[] } | { error: "invalid-document" } {
  if (!json.every(spansFit)) {
    return { error: "invalid-document" };
  }
  const blocks = toStoredBlocks(editor, json);
  // The conversion fits invalid layout without an error: for example, a
  // column list with one column gets a second column. Equal numbers of
  // children show that it added or removed no block, thus that the JSON fit
  // the schema as it was.
  return blocks === undefined ||
    !sameChildCounts(json, blocks) ||
    duplicateId(blocks) !== undefined
    ? { error: "invalid-document" }
    : { blocks };
}

/**
 * The largest spans of a table cell, as in the HTML table model (a browser
 * uses at most these values). A larger span gives a table that the editor
 * cannot hold: for example, a column span of 1,000,000 overflows the stack
 * in the conversion of core.
 */
const MAX_COLSPAN = 1000;
const MAX_ROWSPAN = 65534;

/** Returns true if each table cell of the block and of its children has spans in the limits. */
function spansFit(block: PartialBlock<any, any, any>): boolean {
  const content: unknown = block.content;
  const rows =
    typeof content === "object" &&
    content !== null &&
    "type" in content &&
    content.type === "tableContent" &&
    "rows" in content &&
    Array.isArray(content.rows)
      ? (content.rows as { cells?: unknown[] }[])
      : [];
  const cellsFit = rows.every((row) =>
    (row.cells ?? []).every((cell) => {
      const props =
        typeof cell === "object" && cell !== null && "props" in cell
          ? (cell.props as Record<string, unknown> | undefined)
          : undefined;
      return (
        spanFits(props?.colspan, MAX_COLSPAN) &&
        spanFits(props?.rowspan, MAX_ROWSPAN)
      );
    }),
  );
  return cellsFit && (block.children ?? []).every(spansFit);
}

function spanFits(span: unknown, max: number): boolean {
  return typeof span !== "number" || span <= max;
}

/**
 * Returns true if the conversion added or removed no block: the blocks have
 * the same number of children at each place. (A missing type of a block in
 * the JSON gives a paragraph, thus the types are not compared.)
 */
function sameChildCounts(
  json: readonly PartialBlock<any, any, any>[],
  blocks: readonly LensBlock[],
): boolean {
  return (
    json.length === blocks.length &&
    json.every((block, i) =>
      sameChildCounts(block.children ?? [], blocks[i].children),
    )
  );
}

/**
 * Returns the blocks, where a block with an ID of `disallowedIds` gets a new
 * ID: it is a new block. The JSON write gives the IDs that the client cannot
 * mean: the IDs of the blocks that other writers added after the read of the
 * client.
 */
export function replaceDisallowedIds(
  blocks: readonly LensBlock[],
  disallowedIds: ReadonlySet<string>,
): LensBlock[] {
  function fix(block: LensBlock): LensBlock {
    const id = disallowedIds.has(block.id)
      ? UniqueID.options.generateID()
      : block.id;
    return { ...block, id, children: block.children.map(fix) };
  }
  return blocks.map(fix);
}
