import type { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { UniqueID } from "@blocknote/core/extensions";

import { type SchemaRules, schemaRulesOf } from "../blocks/schema.js";
import { withDistinctIds } from "../blocks/ids.js";
import { BlockTree } from "../blocks/tree.js";
import type { LensBlock } from "../blocks/types.js";
import { fitLayout } from "../fit/fitLayout.js";
import { toStoredBlocks } from "../formats/stored.js";

/**
 * Stage 2 for the JSON write: the blocks of the JSON of a client, in the
 * form that the document stores them, with IDs that identify one block each.
 * The JSON contains the block IDs, thus there is no alignment: the target is
 * these blocks.
 *
 * - The layout blocks fit their child rules before the conversion: the
 *   conversion fills a layout block with too few children with new blocks
 *   (for example a column list with one column).
 * - If the blocks do not fit the schema, the result is the error
 *   `"invalid-document"`.
 * - A block with the ID of an earlier block gets the ID with a number (`x-2`,
 *   see `withDistinctIds`), as in the current document and in `base`.
 * - A block gets a new ID where its ID cannot identify it (see
 *   {@link withUniqueIds}).
 */
export function parseJSON(
  editor: BlockNoteEditor<any, any, any>,
  document: readonly PartialBlock<any, any, any>[],
  /** The version that the client read, or the current document for `base: "current"`. */
  base: readonly LensBlock[],
  current: readonly LensBlock[],
): { error?: undefined; blocks: LensBlock[] } | { error: "invalid-document" } {
  const { layoutRuleOf } = schemaRulesOf(editor);
  const blocks = toStoredBlocks(editor, fitLayout(document, layoutRuleOf));
  if (blocks === undefined) {
    return { error: "invalid-document" };
  }
  return {
    blocks: withUniqueIds(withDistinctIds(blocks), base, current, layoutRuleOf),
  };
}

/**
 * Returns the blocks with a new ID where an ID cannot identify the block: a
 * block with an ID that is not in `base` but is in `current` (a block of
 * another writer), or a block that changes between a layout type and another
 * type (for example a column that becomes a paragraph: it cannot change in
 * place). These blocks are new blocks. The IDs of `blocks` are distinct (see
 * `withDistinctIds`).
 */
function withUniqueIds(
  blocks: readonly LensBlock[],
  base: readonly LensBlock[],
  current: readonly LensBlock[],
  layoutRuleOf: SchemaRules["layoutRuleOf"],
): LensBlock[] {
  const inBase = new Set(new BlockTree(base).ids);
  const inCurrent = new BlockTree(current).byId;
  function fix(block: LensBlock): LensBlock {
    const before = inCurrent.get(block.id);
    const keep =
      (inBase.has(block.id) || before === undefined) &&
      (before === undefined ||
        (layoutRuleOf(before.type) === undefined) ===
          (layoutRuleOf(block.type) === undefined));
    const id = keep ? block.id : UniqueID.options.generateID();
    return { ...block, id, children: block.children.map(fix) };
  }
  return blocks.map(fix);
}
