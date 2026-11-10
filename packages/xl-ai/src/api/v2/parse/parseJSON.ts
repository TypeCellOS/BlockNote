import type { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { UniqueID } from "@blocknote/core/extensions";

import { withDistinctIds } from "../blocks/ids.js";
import { schemaRulesOf } from "../blocks/schema.js";
import type { LensBlock } from "../blocks/types.js";
import { fitLayout } from "../fit/fitLayout.js";
import { toStoredBlocks } from "../formats/stored.js";

/**
 * Stage 2 for JSON: the blocks of the JSON of a client, in the form that the
 * document stores them (as `parseText` for a text).
 *
 * - The layout blocks fit their child rules before the conversion: the
 *   conversion fills a layout block with too few children with new blocks
 *   (for example a column list with one column).
 * - If the blocks do not fit the schema, the result is the error
 *   `"invalid-document"`.
 * - A block with the ID of an earlier block gets the ID with a number (`x-2`,
 *   see `withDistinctIds`), as in the current document and in `base`.
 */
export function parseJSON(
  editor: BlockNoteEditor<any, any, any>,
  json: readonly PartialBlock<any, any, any>[],
): { error?: undefined; blocks: LensBlock[] } | { error: "invalid-document" } {
  const { layoutRuleOf } = schemaRulesOf(editor);
  const blocks = toStoredBlocks(editor, fitLayout(json, layoutRuleOf));
  return blocks === undefined
    ? { error: "invalid-document" }
    : { blocks: withDistinctIds(blocks) };
}

/**
 * Returns the blocks, where a block with an ID of `ids` gets a new ID: it is
 * a new block. The JSON write gives the IDs that the client cannot mean: the
 * IDs of the blocks that other writers added after the read of the client.
 */
export function withNewIds(
  blocks: readonly LensBlock[],
  ids: ReadonlySet<string>,
): LensBlock[] {
  function fix(block: LensBlock): LensBlock {
    const id = ids.has(block.id) ? UniqueID.options.generateID() : block.id;
    return { ...block, id, children: block.children.map(fix) };
  }
  return blocks.map(fix);
}
