import { blockToNode, type PartialBlock } from "@blocknote/core";
import { UniqueID } from "@blocknote/core/extensions";
import {
  type ContentMatch,
  Fragment,
  type Node,
  Slice,
} from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import { ReplaceStep } from "prosemirror-transform";

import type { LensBlock } from "../model.js";
import { gaps, isChanged, myersMatch } from "../util/sequence/index.js";

/**
 * Makes the structure of the document agree with `target` (the document
 * that `applyToBlocks` gives), in two steps: decide, then apply.
 *
 * 1. Decide the replacements (see {@link replacementsOf}): in each list of
 *    children, the children that stay (a common subsequence of IDs) keep
 *    their nodes and positions. Each run of children between them gets one
 *    replacement with the nodes of the target (see {@link nodeBuilder}: a
 *    block of the document keeps its node, with its comments).
 * 2. Apply them (see {@link applyReplacements}): first the inserts, then the
 *    removals. Thus, each step gives a valid document, also for a list with
 *    a minimum number of children (for example a column list), and a
 *    collaboration binding can send each step alone (see `dispatchSteps`).
 *
 * Thus, an insert is one step that only inserts, and a collaboration
 * binding, a suggestion plugin or a selection sees only the changed blocks.
 *
 * Method: our own design. The common subsequence of each list is the Myers
 * diff of the child IDs.
 *
 * @internal
 */
export function applyStructure(
  tr: Transaction,
  target: readonly LensBlock[],
): void {
  applyReplacements(tr, replacementsOf(tr.doc, target));
}

/**
 * A replacement of the old children of a list, from `from` to `to`, with the
 * nodes of `content`. The positions are in the document before the steps.
 */
type Replacement = { from: number; to: number; content: Node[] };

/**
 * Decides the replacements that change each list of children of `doc` to
 * the blocks of `target`. It reads the document, and changes nothing.
 */
function replacementsOf(
  doc: Node,
  target: readonly LensBlock[],
): Replacement[] {
  const rootGroup = doc.firstChild;
  if (rootGroup === null) {
    throw new Error("The document has no block group");
  }
  const decisions: Decisions = { build: nodeBuilder(doc), replacements: [] };
  decideList(decisions, rootGroup, 0, target);
  return decisions.replacements;
}

/** The node builder of the document, and the replacements decided so far. */
type Decisions = {
  build: (block: LensBlock) => Node;
  replacements: Replacement[];
};

/**
 * Decides the replacements for the children of `list` (a block group, or a
 * layout block that holds its children) at `pos`: one for each run of
 * children between the children that stay. Then it continues in the
 * children that stay.
 */
function decideList(
  decisions: Decisions,
  list: Node,
  pos: number,
  blocks: readonly LensBlock[],
) {
  const end = pos + list.nodeSize - 1;
  const old: { node: Node; pos: number }[] = [];
  list.forEach((child, offset) => {
    old.push({ node: child, pos: pos + 1 + offset });
  });
  const stay = myersMatch(
    old.map(({ node }) => node.attrs.id as string),
    blocks.map((block) => block.id),
    (a, b) => a === b,
  );
  for (const gap of gaps(stay, old.length, blocks.length)) {
    if (isChanged(gap)) {
      decisions.replacements.push({
        from: gap.aStart < old.length ? old[gap.aStart].pos : end,
        to: gap.aEnd < old.length ? old[gap.aEnd].pos : end,
        content: blocks.slice(gap.bStart, gap.bEnd).map(decisions.build),
      });
    }
    if (gap.anchor) {
      const kept = old[gap.anchor.aIndex];
      decideChildren(
        decisions,
        kept.node,
        kept.pos,
        blocks[gap.anchor.bIndex].children,
      );
    }
  }
  // A list with too few children gets the fill of the schema at its end, as
  // ProseMirror fills it in the editor. Examples: a document without blocks,
  // a column that the operations empty, a tab set that lost tabs. The insert
  // is after the other inserts at the end.
  const fill = fillAtEnd(list, blocks);
  if (fill.length > 0) {
    decisions.replacements.push({ from: end, to: end, content: fill });
  }
}

/**
 * The nodes that the schema adds at the end of `list` (a block group, or a
 * layout block) if its children are `blocks`: none if they fit its content
 * (the minimum), else the fill of ProseMirror (for an empty document: a
 * block with an empty paragraph; for a tab set: a tab with an empty
 * paragraph). The node type of a block with content is `blockContainer`.
 * Each block of the fill gets a new ID (see {@link withBlockIds}).
 */
function fillAtEnd(list: Node, blocks: readonly LensBlock[]): Node[] {
  const schema = list.type.schema;
  let match: ContentMatch | null = list.type.contentMatch;
  for (const block of blocks) {
    const type = schema.nodes[block.type];
    match =
      match?.matchType(
        type?.isInGroup("bnBlock") ? type : schema.nodes["blockContainer"],
      ) ?? null;
  }
  // `null`: the types do not fit in any number. Then the step throws (a bug).
  const fill = match?.fillBefore(Fragment.empty, true);
  const nodes: Node[] = [];
  fill?.forEach((node) => nodes.push(withBlockIds(node)));
  return nodes;
}

/** Decides the replacements for the children of the block at `pos`. */
function decideChildren(
  decisions: Decisions,
  block: Node,
  pos: number,
  children: readonly LensBlock[],
) {
  if (block.type.name !== "blockContainer") {
    // A layout block (for example a column) holds its children directly.
    decideList(decisions, block, pos, children);
    return;
  }
  // A block with content holds its children in a block group, after its
  // content node.
  const groupPos = pos + 1 + block.child(0).nodeSize;
  const group = block.maybeChild(1);
  if (group !== null && children.length > 0) {
    decideList(decisions, group, groupPos, children);
  } else if (group !== null) {
    // A block group needs a child, thus it goes with its last child.
    decisions.replacements.push({
      from: groupPos,
      to: groupPos + group.nodeSize,
      content: [],
    });
  } else if (children.length > 0) {
    // A block without children gets a block group for its new children.
    const schema = block.type.schema;
    decisions.replacements.push({
      from: groupPos,
      to: groupPos,
      content: [
        schema.nodes["blockGroup"].create(null, children.map(decisions.build)),
      ],
    });
  }
}

/**
 * Applies the replacements, first each insert, then each removal. Inserts
 * never give an invalid list. The steps map the positions through the
 * steps before them.
 *
 * A removal does not remove the nodes that an insert put at its start or
 * at its end: its start maps to after them, its end to before them. An
 * example is the fill at the end of a layout block (see `fillAtEnd`) after
 * a removal of its last children.
 */
function applyReplacements(
  tr: Transaction,
  replacements: readonly Replacement[],
) {
  const inserts = replacements.flatMap(({ from, content }) =>
    content.length > 0 ? [{ from, to: from, content }] : [],
  );
  const removals = replacements.flatMap(({ from, to }) =>
    to > from ? [{ from, to, content: [] }] : [],
  );
  const first = tr.steps.length;
  for (const { from, to, content } of [...inserts, ...removals]) {
    const mapping = tr.mapping.slice(first);
    const start = mapping.map(from);
    tr.step(
      new ReplaceStep(
        start,
        to === from ? start : mapping.map(to, -1),
        new Slice(Fragment.from(content), 0, 0),
      ),
    );
  }
}

/**
 * Returns the function that gives the node of a block of the target: the
 * node of the document if it has the same structure, at all depths (thus it
 * keeps its content and comments), else a node with the nodes of the
 * children of the block. A block of the document keeps its node as the
 * shell of the new node; a new block gets a new node.
 */
function nodeBuilder(doc: Node): (block: LensBlock) => Node {
  const schema = doc.type.schema;
  const nodes = new Map<string, Node>();
  doc.descendants((node) => {
    if (node.type.isInGroup("bnBlock")) {
      nodes.set(node.attrs.id, node);
    }
    return !node.isTextblock;
  });
  function build(block: LensBlock): Node {
    const found = nodes.get(block.id);
    if (found !== undefined && sameStructure(found, block)) {
      return found;
    }
    const shell =
      found ?? blockToNode({ ...block, children: [] } as PartialBlock, schema);
    return withChildren(shell, block.children.map(build));
  }
  return build;
}

/** Returns true if the node has the structure of the block, at all depths. */
function sameStructure(node: Node, block: LensBlock): boolean {
  const children = childBlocks(node);
  return (
    children.length === block.children.length &&
    children.every(
      (child, i) =>
        child.attrs.id === block.children[i].id &&
        sameStructure(child, block.children[i]),
    )
  );
}

/** The child blocks of a block node (in its block group, or in the node itself for a layout block), or of a block group. */
function childBlocks(node: Node): Node[] {
  const children: Node[] = [];
  node.forEach((child) => {
    if (child.type.isInGroup("bnBlock")) {
      children.push(child);
    } else if (child.type.name === "blockGroup") {
      child.forEach((grandchild) => children.push(grandchild));
    }
  });
  return children;
}

/**
 * The block node with other children. A block with content keeps its
 * content node (thus its text and comments), and gets a block group for
 * the children. A layout block (for example a column) holds the children
 * directly. If the children do not fit the layout block (for example a
 * column that the operations empty), the schema fills it.
 */
function withChildren(block: Node, children: readonly Node[]): Node {
  const schema = block.type.schema;
  if (block.type.name === "blockContainer") {
    const content = block.firstChild;
    if (content === null) {
      throw new Error("A block has no content node");
    }
    return block.type.create(
      block.attrs,
      children.length > 0
        ? [content, schema.nodes["blockGroup"].create(null, children)]
        : [content],
      block.marks,
    );
  }
  const filled = block.type.createAndFill(block.attrs, children, block.marks);
  if (filled === null) {
    throw new Error(
      `The children do not fit a block of type ${block.type.name}`,
    );
  }
  return withBlockIds(filled);
}

/**
 * The node, with a new ID for each block in it that has none. Only the
 * fill of the schema makes such blocks: a block of the document and a block
 * of an insert have an ID. Thus, the transaction needs no plugin that gives
 * IDs (the ID extension of an editor), and the steps can go to a document
 * without an editor, for example the document of a Y.Doc. A node without
 * such a block stays the same node.
 */
function withBlockIds(node: Node): Node {
  if (node.isText) {
    return node;
  }
  const children: Node[] = [];
  let changed = false;
  node.forEach((child) => {
    const withIds = withBlockIds(child);
    changed ||= withIds !== child;
    children.push(withIds);
  });
  const needsId = node.type.isInGroup("bnBlock") && node.attrs.id == null;
  if (!changed && !needsId) {
    return node;
  }
  return node.type.create(
    needsId ? { ...node.attrs, id: UniqueID.options.generateID() } : node.attrs,
    children,
    node.marks,
  );
}
