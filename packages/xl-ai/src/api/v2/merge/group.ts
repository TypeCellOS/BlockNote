import { deepEqual } from "../blocks/json.js";
import type { BlockTree } from "../blocks/tree.js";
import {
  type BlockFields,
  type ContentKind,
  inlineContentOf,
  type LensInlineContent,
} from "../blocks/types.js";
import { mergeUnits } from "./inline.js";
import { fromUnits, type InlineUnit, toUnits } from "./inlineUnits.js";
import type { MergeOptions } from "./threeWay.js";

/**
 * Experimental (see `TextUpdateOptions.experimentalTextMoves`). Blocks whose
 * text a split or a join moved: the text of the `base` blocks (in the order
 * of their text) is now in the `ours` blocks (in the order of their text).
 * The planner finds these blocks (see `planTarget`), and the rebase merges
 * their content as one text (see {@link mergeTextGroups}).
 */
export type TextGroup = { base: string[]; ours: string[] };

/** A block of a group: its ID and its inline content. For `changed`, see `InlineUnit`. */
export type GroupBlock = {
  id: string;
  content: readonly LensInlineContent[];
  changed?: boolean;
};

/**
 * Three-way merge of the content of a group of blocks, as one text (see
 * `mergeUnits`). The text of each side is the content of its blocks, in
 * order, with a break at the start of each block. Thus, a split (a new
 * break of `ours`) and a join (a break that `ours` removed) move text. The
 * hidden styles of the moved text stay, and the changes of `theirs` to it go
 * to the block that holds it in the result. A split or a join changes the
 * text where it occurs: if `theirs` changed the same text, that is a
 * conflict (see `MergeOptions`).
 *
 * Returns the content of each block of the result, by ID. These are the
 * blocks of `ours`, without the blocks whose break a conflict removed, and
 * the blocks of `theirs` whose break a conflict kept (for example a block
 * that `ours` joined to the block before it, and whose props `theirs`
 * changed). If two breaks of the result have one ID (a side moved the start
 * of a block, and a conflict kept the old start), the first break wins: the
 * text after the second break stays in the block before it. `onConflictIn`
 * gets the ID of the block of each conflict.
 */
export function mergeGroupContent(
  base: readonly GroupBlock[],
  ours: readonly GroupBlock[],
  theirs: readonly GroupBlock[],
  options: MergeOptions & { onConflictIn?: (id: string) => void },
): Map<string, LensInlineContent[]> {
  const conflicts: number[] = [];
  const units = mergeUnits(
    unitsOf(base),
    unitsOf(ours),
    unitsOf(theirs, options.shadowOf),
    options,
    (at) => conflicts.push(at),
  );

  const contents = new Map<string, InlineUnit[]>();
  /** The ID of the block of each unit of the result. */
  const owners: string[] = [];
  let current: { id: string; units: InlineUnit[] } | undefined;
  for (const unit of units) {
    if (unit.kind === "break" && !contents.has(unit.id)) {
      current = { id: unit.id, units: [] };
      contents.set(unit.id, current.units);
    } else if (current === undefined) {
      // Each side starts with a break, thus the result does too.
      throw new Error(
        "The merged content of a group does not start with a break",
      );
    } else if (unit.kind !== "break") {
      current.units.push(unit);
    }
    owners.push(current.id);
  }
  for (const at of conflicts) {
    const owner = owners[at] ?? owners.at(-1);
    if (owner !== undefined) {
      options.onConflictIn?.(owner);
    }
  }
  return new Map(
    [...contents].map(([id, blockUnits]) => [id, fromUnits(blockUnits)]),
  );
}

function unitsOf(
  blocks: readonly GroupBlock[],
  shadowOf?: MergeOptions["shadowOf"],
): InlineUnit[] {
  return blocks.flatMap(({ id, content, changed }): InlineUnit[] => [
    { kind: "break", id, changed: changed ?? false },
    ...toUnits(content, shadowOf),
  ]);
}

/**
 * The rebase of the groups of the client (see `mergeTree`): merges the
 * content of the blocks of each group as one text (see
 * {@link mergeGroupContent}). In each side, the blocks are in the order of
 * their text. The breaks align by their place in the text: thus, the changes
 * of other writers to the moved text go to the block that holds it, and the
 * moved text is not a removal from the old block.
 *
 * Returns the content of each block of a group, or `undefined` if the merge
 * gives the block no content (then the block goes), and the blocks with a
 * conflict. A group with blocks of different kinds of content (another
 * writer changed a paragraph to a code block) merges block by block.
 */
export function mergeTextGroups(input: {
  base: BlockTree;
  ours: BlockTree;
  theirs: BlockTree;
  groups?: readonly TextGroup[];
  contentKindOf: (type: string) => ContentKind;
}): {
  pieceOf: Map<string, LensInlineContent[] | undefined>;
  conflicts: Set<string>;
} {
  const { base, ours, theirs } = input;
  const pieceOf = new Map<string, LensInlineContent[] | undefined>();
  const conflicts = new Set<string>();
  for (const group of input.groups ?? []) {
    const sides = [
      { side: base, ids: group.base },
      { side: ours, ids: group.ours },
      { side: theirs, ids: group.base.filter((id) => theirs.has(id)) },
    ];
    const kinds = sides.flatMap(({ side, ids }) =>
      ids.map((id) => input.contentKindOf(side.block(id).type)),
    );
    if (new Set(kinds).size > 1) {
      continue;
    }
    const [baseBlocks, ourBlocks, theirBlocks] = sides.map(({ side, ids }) =>
      ids.map((id) => ({
        id,
        content: inlineContentOf(side.block(id)),
        // The client removed (joined) a block whose type or props another
        // writer changed: a conflict.
        changed:
          side === theirs &&
          !ours.has(id) &&
          !sameFields(base.block(id), theirs.block(id)),
      })),
    );
    const pieces = mergeGroupContent(baseBlocks, ourBlocks, theirBlocks, {
      concurrent: true,
      onConflictIn: (id) => conflicts.add(id),
    });
    for (const id of [...group.base, ...group.ours]) {
      pieceOf.set(id, pieces.get(id));
    }
  }
  return { pieceOf, conflicts };
}

function sameFields(a: BlockFields, b: BlockFields): boolean {
  return a.type === b.type && deepEqual(a.props, b.props);
}
