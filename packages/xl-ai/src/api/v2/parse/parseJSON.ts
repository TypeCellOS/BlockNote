import type { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { UniqueID } from "@blocknote/core/extensions";

import type { LensBlock } from "../model.js";
import { withDistinctIds } from "../util/blocks/index.js";
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
 * - A block with the ID of an earlier block gets the ID with a number (`x-2`,
 *   see `withDistinctIds`), as in the current document and in `base`.
 */
export function parseJSON(
  editor: BlockNoteEditor<any, any, any>,
  json: readonly PartialBlock<any, any, any>[],
): { error?: undefined; blocks: LensBlock[] } | { error: "invalid-document" } {
  const blocks = toStoredBlocks(editor, json);
  return blocks === undefined || !sameChildCounts(json, blocks)
    ? { error: "invalid-document" }
    : { blocks: withDistinctIds(blocks) };
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
