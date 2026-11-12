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
import { buildTargetDocument, type TargetRow } from "./buildTargetDocument.js";
import { withInvisibleBlocks } from "./invisibleBlocks.js";
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
 * 1. The rows: a text block with a pair is a source block that stays (a
 *    kept row, with the source block of its view block). Its fields merge
 *    three-way (see `merge/block.ts`): `base` is the view block, `ours` is
 *    the text block, and `theirs` is the source block. A text block without
 *    a pair is a new block, with the fields of the text block.
 * 2. The source blocks that stay: the source blocks of the kept rows, and
 *    the invisible blocks that the text cannot remove (see
 *    `withInvisibleBlocks`).
 * 3. The nesting: the blocks in the order of the text, in the parent that the
 *    text shows, with the nesting that the format does not show, and the
 *    hidden blocks at their source positions (see `buildTargetDocument`).
 */
export function targetFromPairs(input: TargetInput): TargetResult {
  const sourceIndex = new BlockIndex(input.source);
  const { view, invisibleIds } = input.projection;
  /** The pair of each text block, if it has one. */
  const pairOf: (BlockPair | undefined)[] = new Array(input.incoming.length);
  for (const pair of input.alignment) {
    pairOf[pair.bIndex] = pair;
  }
  const warnings: TargetWarning[] = [];
  const rows = input.incoming.map(({ block: text }, j): TargetRow => {
    const pair = pairOf[j];
    if (pair === undefined) {
      return { kind: "new", fields: text };
    }
    const { block: base, sourceId: id } = view[pair.aIndex];
    const source = sourceIndex.block(id);
    const fields = mergeBlock(base, text, source, input.contentKindOf, {
      shadowOf: input.shadowOf,
    });
    if (base.type === text.type && fields.type !== source.type) {
      warnings.push({ type: "block-shape-replaced", id });
    }
    return {
      kind: "kept",
      id,
      viewIndex: pair.aIndex,
      moved: pair.moved === true,
      fields,
    };
  });
  const keptIds = rows.flatMap((row) => (row.kind === "kept" ? [row.id] : []));
  const target = buildTargetDocument({
    rows,
    incoming: input.incoming,
    view,
    source: sourceIndex,
    invisibleIds,
    kept: withInvisibleBlocks(sourceIndex, invisibleIds, keptIds),
    newId: input.newId,
  });
  return { target, warnings };
}

type TargetResult = { target: LensBlock[]; warnings: TargetWarning[] };
