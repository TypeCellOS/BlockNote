import type {
  ContentKind,
  FlatBlock,
  LensBlock,
  LensInlineContent,
} from "../model.js";
import { BlockIndex } from "../util/blocks/index.js";
import type { BlockPair } from "../alignment/index.js";
import { mergeBlock } from "../merge/index.js";
import type { Projection } from "../projection/index.js";
import { buildTree, type TreeRow } from "./buildTree.js";
import { correspond } from "./correspond.js";
import type { TargetWarning } from "./types.js";

export type { TargetWarning } from "./types.js";

/** The input of {@link targetFromPairs}: the source, its projection, the text blocks and the alignment. */
export type TargetInput = {
  /** The document that the change starts from (`base`, or the current document). */
  source: readonly LensBlock[];
  /** `source` as the format shows it. */
  projection: Projection;
  /** The blocks of the text, in a flat list. */
  incoming: FlatBlock[];
  /** The matches of `projection.view` (a side) to `incoming` (b side). */
  alignment: BlockPair[];
  contentKindOf: (type: string) => ContentKind;
  /** The text that the format shows for an inline item that it does not give back (see `MergeOptions.shadowOf`). */
  shadowOf?: (item: LensInlineContent) => string | undefined;
  /** Gives the ID of a new block. */
  newId: () => string;
};

/**
 * Makes the target document: `source` as the text asks for it.
 *
 * 1. The correspondence: which source block each block of the text is, if
 *    it is one, and which source blocks stay (see `correspond`).
 * 2. The fields: a kept block merges its fields three-way (see
 *    `merge/block.ts`): `base` is the view block, `ours` is the text block,
 *    and `theirs` is the source block. A new block has the fields of the
 *    text block.
 * 3. The tree: the blocks in the order of the text, in the parent that the
 *    text shows, with the nesting that the format does not show, and the
 *    hidden blocks at their source positions (see `buildTree`).
 */
export function targetFromPairs(input: TargetInput): TargetResult {
  const sourceIndex = new BlockIndex(input.source);
  const { rows, kept, warnings } = correspond(input, sourceIndex);
  const treeRows = rows.map((row, j): TreeRow => {
    switch (row.kind) {
      case "skipped":
        return row;
      case "new":
        return { ...row, fields: input.incoming[j].block };
      case "kept": {
        const fields = mergeBlock(
          row.base,
          row.text,
          sourceIndex.block(row.id),
          input.contentKindOf,
          { shadowOf: input.shadowOf },
        );
        if (
          row.base.type === row.text.type &&
          fields.type !== sourceIndex.block(row.id).type
        ) {
          warnings.push({ type: "block-shape-replaced", id: row.id });
        }
        return {
          kind: "kept",
          id: row.id,
          viewIndex: row.viewIndex,
          moved: row.moved,
          fields,
        };
      }
    }
  });
  const target = buildTree({
    rows: treeRows,
    incoming: input.incoming,
    view: input.projection.view,
    source: sourceIndex,
    invisibleIds: input.projection.invisibleIds,
    kept,
    newId: input.newId,
  });
  return { target, warnings };
}

type TargetResult = { target: LensBlock[]; warnings: TargetWarning[] };
