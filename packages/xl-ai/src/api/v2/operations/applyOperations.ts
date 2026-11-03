import {
  type BlockNoteEditor,
  blockToNode,
  docToBlocks,
  getBlockInfoAt,
  inlineContentToNodes,
  type PartialBlock,
  updateBlockTr,
} from "@blocknote/core";
import { Fragment, type Node, Slice } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import { ReplaceStep, type Step } from "prosemirror-transform";

import {
  isTableContent,
  type LensPartialBlock,
  type LensTableContent,
} from "../blocks/types.js";
import { fixBlockIds } from "./blockIds.js";
import { dispatchUpdate } from "./dispatch.js";
import { myersMatch } from "../diff/myers.js";
import { applyToBlocks, type BlockShape } from "./applyToBlocks.js";
import { addInlineContentSteps } from "./inlineSteps.js";
import type { BlockOperation } from "./types.js";

/**
 * Applies the operations to the editor in sequence. Returns the ProseMirror
 * steps of the operations, as they apply to the editor state before the
 * write. The editor gets them in one transaction, or, for an editor that is
 * bound to a Y.Doc, in groups (see `dispatchUpdate`). There, the steps of
 * other plugins can come between the groups.
 */
export function applyBlockOperations(
  editor: BlockNoteEditor<any, any, any>,
  operations: readonly BlockOperation[],
): readonly Step[] {
  if (operations.length === 0) {
    return [];
  }
  const tr = editor.prosemirrorState.tr;
  applyOperations(tr, operations);
  dispatchUpdate(editor, tr);
  return [...tr.steps];
}

/**
 * Applies the operations to the document of a ProseMirror transaction. The
 * document can come from an editor or from a Y.Doc.
 *
 * The operations change only what they must. Thus, data that is not in the
 * Block JSON stays, for example comments:
 * - An update changes the block in place: inline content through the
 *   smallest ProseMirror steps (see `addInlineContentSteps`).
 * - The inserts, the moves and the removals give the structure of the
 *   result (see `applyToBlocks`). In each list of children, each run of
 *   changed children is replaced in one step (see `applyStructure`), with
 *   the ProseMirror nodes of the blocks that the document has (a moved
 *   block keeps its node, with its comments) and new nodes. Only a list
 *   that must have children and has none gets the fill of the schema.
 *
 * At the end, each block has one ID that no other block has.
 */
export function applyOperations(
  tr: Transaction,
  operations: readonly BlockOperation[],
): void {
  fixBlockIds(tr);
  const updates = operations.flatMap((operation) =>
    operation.type === "update" ? [operation] : [],
  );
  if (updates.length > 0) {
    updateBlocks(tr, updates);
  }
  if (updates.length < operations.length) {
    applyStructure(tr, applyToBlocks(docToBlocks(tr.doc), operations));
  }
  fixBlockIds(tr);
}

/**
 * Makes the structure of the document agree with `target`. In each list of
 * children, the children that stay (a common subsequence of IDs) keep their
 * nodes and positions, and each run of children between them is replaced
 * in one step. Thus, an insert is one step that only inserts, and a
 * collaboration binding, a suggestion plugin or a selection sees only the
 * changed blocks.
 *
 * Each step only inserts or only removes. The inserts apply first, then the
 * removals. Thus, each step gives a valid document, also for a list with a
 * minimum number of children (for example a column list). A collaboration
 * binding can then also send each step alone (see `dispatchSteps`).
 */
function applyStructure(tr: Transaction, target: BlockShape[]) {
  const schema = tr.doc.type.schema;
  const nodes = new Map<string, Node>();
  tr.doc.descendants((node) => {
    if (node.type.isInGroup("bnBlock")) {
      nodes.set(node.attrs.id, node);
    }
    return !node.isTextblock;
  });

  /** A replacement of the old children from `from` to `to` with `content`. */
  type Replacement = { from: number; to: number; content: Node[] };
  const replacements: Replacement[] = [];
  const rootGroup = tr.doc.firstChild;
  if (rootGroup === null) {
    throw new Error("The document has no block group");
  }
  diffList(rootGroup, 0, target);

  // Each replacement is an insert and a removal. Inserts never give an
  // invalid list, thus they apply first. Then the removals.
  const first = tr.steps.length;
  const steps = [
    ...replacements.flatMap(({ from, content }) =>
      content.length > 0 ? [{ from, to: from, content }] : [],
    ),
    ...replacements.flatMap(({ from, to }) =>
      to > from ? [{ from, to, content: [] }] : [],
    ),
  ];
  for (const { from, to, content } of steps) {
    const mapping = tr.mapping.slice(first);
    tr.step(
      new ReplaceStep(
        mapping.map(from),
        mapping.map(to),
        new Slice(Fragment.from(content), 0, 0),
      ),
    );
  }

  /** Adds the replacements that change the children of the block at `pos` to `shapes`. */
  function diffChildren(
    block: Node,
    pos: number,
    shapes: readonly BlockShape[],
  ) {
    if (block.type.name !== "blockContainer") {
      // A layout block holds its children directly.
      diffList(block, pos, shapes);
      return;
    }
    const groupPos = pos + 1 + block.child(0).nodeSize;
    const group = block.maybeChild(1);
    if (group === null) {
      // A block without children gets a block group for its new children.
      if (shapes.length > 0) {
        const content = [
          schema.nodes["blockGroup"].create(null, shapes.map(build)),
        ];
        replacements.push({ from: groupPos, to: groupPos, content });
      }
    } else if (shapes.length === 0) {
      // A block group needs a child, thus it goes with its last child.
      replacements.push({
        from: groupPos,
        to: groupPos + group.nodeSize,
        content: [],
      });
    } else {
      diffList(group, groupPos, shapes);
    }
  }

  /**
   * Adds the replacements that change the children of `list` (a block group
   * or a layout block at `pos`) to `shapes`: one for each run of children
   * between the children that stay.
   */
  function diffList(list: Node, pos: number, shapes: readonly BlockShape[]) {
    const old: { node: Node; pos: number }[] = [];
    list.forEach((child, offset) => {
      old.push({ node: child, pos: pos + 1 + offset });
    });
    const end = pos + list.nodeSize - 1;
    if (shapes.length === 0) {
      // A list without children (the document, or an empty column of the
      // "yjs" strategy, see `keepLayout`) gets the fill of the schema.
      const filled = list.type.createAndFill(list.attrs);
      if (filled === null) {
        throw new Error(`A block of type ${list.type.name} cannot be empty`);
      }
      const content = childBlocks(filled);
      replacements.push({ from: pos + 1, to: end, content });
      return;
    }
    const pairs = myersMatch(
      old.map(({ node }) => node.attrs.id as string),
      shapes.map((shape) => shape.block.id),
      (a, b) => a === b,
    );
    let i = 0;
    let k = 0;
    for (const pair of [
      ...pairs,
      { aIndex: old.length, bIndex: shapes.length },
    ]) {
      if (pair.aIndex > i || pair.bIndex > k) {
        replacements.push({
          from: i < old.length ? old[i].pos : end,
          to: pair.aIndex < old.length ? old[pair.aIndex].pos : end,
          content: shapes.slice(k, pair.bIndex).map(build),
        });
      }
      if (pair.aIndex < old.length) {
        const kept = old[pair.aIndex];
        diffChildren(kept.node, kept.pos, shapes[pair.bIndex].children);
      }
      i = pair.aIndex + 1;
      k = pair.bIndex + 1;
    }
  }

  /** Returns true if the node has the structure of the shape, at all depths. */
  function sameStructure(node: Node, shape: BlockShape): boolean {
    const children = childBlocks(node);
    return (
      children.length === shape.children.length &&
      children.every(
        (child, i) =>
          child.attrs.id === shape.children[i].block.id &&
          sameStructure(child, shape.children[i]),
      )
    );
  }

  /** The node of the shape: the node of the document if its structure is the same, else a new node with the nodes of its children. */
  function build(shape: BlockShape): Node {
    const found = nodes.get(shape.block.id);
    if (found !== undefined && sameStructure(found, shape)) {
      return found;
    }
    const shell =
      found ??
      blockToNode({ ...shape.block, children: [] } as PartialBlock, schema);
    return withChildren(shell, shape.children.map(build));
  }
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
 * directly. If the children do not fit the layout block (an empty column of
 * the "yjs" strategy, see `keepLayout`), the schema fills it.
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
  return filled;
}

/**
 * Applies a run of updates. An update does not change the structure of the
 * document. It changes only the positions after the start of its block.
 * Thus, one walk of the document gives the position of each block, and the
 * updates apply from the last block to the first: then each position stays
 * correct. This is linear in the size of the document.
 */
function updateBlocks(
  tr: Transaction,
  updates: readonly Extract<BlockOperation, { type: "update" }>[],
) {
  const positions = new Map<string, number>();
  tr.doc.descendants((node, pos) => {
    if (node.type.isInGroup("bnBlock") && typeof node.attrs.id === "string") {
      positions.set(node.attrs.id, pos);
    }
    // The text of a block contains no blocks.
    return !node.isTextblock;
  });
  const withPositions = updates.map((update) => {
    const pos = positions.get(update.id);
    if (pos === undefined) {
      throw new Error(`Block ${update.id} is not in the document`);
    }
    return { pos, update: update.update };
  });
  withPositions.sort((a, b) => b.pos - a.pos);
  for (const { pos, update } of withPositions) {
    updateBlock(tr, pos, update);
  }
}

/**
 * Updates the block at `posBeforeNode`. The type and props go through
 * `updateBlockTr`. Inline content goes through the smallest ProseMirror
 * steps. Thus, text that did not change keeps its identity and its comments.
 * The block keeps its start position.
 */
function updateBlock(
  tr: Transaction,
  posBeforeNode: number,
  update: LensPartialBlock,
) {
  const { content, ...fields } = update;
  if (
    fields.type !== undefined &&
    changesContentKind(tr, posBeforeNode, fields.type)
  ) {
    // For example a paragraph that becomes a table: the new type needs its
    // content in the same change.
    updateBlockTr(tr, posBeforeNode, update as PartialBlock);
    return;
  }
  if (fields.type !== undefined || fields.props !== undefined) {
    updateBlockTr(tr, posBeforeNode, fields as PartialBlock);
  }
  if (!("content" in update)) {
    return;
  }

  if (isTableContent(content) && updateTableCells(tr, posBeforeNode, content)) {
    return;
  }
  const info = getBlockInfoAt(tr.doc, posBeforeNode);
  if (
    !Array.isArray(content) ||
    !info.hasContent ||
    !info.content.node.isTextblock
  ) {
    updateBlockTr(tr, posBeforeNode, { content } as PartialBlock);
    return;
  }
  const target = Fragment.from(
    inlineContentToNodes<any, any>(
      content,
      tr.doc.type.schema,
      info.content.node.type.name,
    ),
  );
  addInlineContentSteps(
    tr,
    info.content.beforePos + 1,
    info.content.node,
    target,
  );
}

/**
 * Returns true if the block at the position and the new type do not both
 * have inline content (for example a paragraph and a table).
 */
function changesContentKind(
  tr: Transaction,
  posBeforeNode: number,
  type: string,
): boolean {
  const info = getBlockInfoAt(tr.doc, posBeforeNode);
  const current = info.hasContent ? info.content.node : undefined;
  const next = tr.doc.type.schema.nodes[type];
  return !(current?.isTextblock && next?.isTextblock);
}

/**
 * Updates a table cell by cell, if the new table has the same rows and cells
 * (the same number and the same cell types). A cell with changed attributes
 * (for example a color) gets the new attributes, and a cell with changed text
 * gets the smallest steps. Thus, comments in the cells stay. Returns false if
 * the tables do not have the same rows and cells. Then the caller replaces
 * the content.
 */
function updateTableCells(
  tr: Transaction,
  posBeforeNode: number,
  content: LensTableContent,
): boolean {
  const info = getBlockInfoAt(tr.doc, posBeforeNode);
  const target = blockToNode(
    { type: "table", content } as PartialBlock,
    tr.doc.type.schema,
  ).firstChild;
  if (
    !info.hasContent ||
    target === null ||
    !sameTableShape(info.content.node, target)
  ) {
    return false;
  }

  const cells = tableCells(info.content.node, info.content.beforePos + 1);
  const targetCells = tableCells(target, 0);
  // From the last cell to the first. Thus, a change does not move the
  // positions of the cells before it.
  for (let i = cells.length - 1; i >= 0; i--) {
    const { node, pos } = cells[i];
    const targetCell = targetCells[i].node;
    if (!node.sameMarkup(targetCell)) {
      tr.setNodeMarkup(pos, undefined, targetCell.attrs);
    }
    const paragraph = node.firstChild;
    const targetParagraph = targetCell.firstChild;
    if (paragraph !== null && targetParagraph !== null) {
      // The text starts after the open tokens of the cell and of its paragraph.
      addInlineContentSteps(tr, pos + 2, paragraph, targetParagraph.content);
    }
  }
  return true;
}

/** Returns true if two table nodes have the same rows, with the same number and types of cells. */
function sameTableShape(a: Node, b: Node): boolean {
  if (a.childCount !== b.childCount) {
    return false;
  }
  for (let r = 0; r < a.childCount; r++) {
    const rowA = a.child(r);
    const rowB = b.child(r);
    if (rowA.childCount !== rowB.childCount) {
      return false;
    }
    for (let c = 0; c < rowA.childCount; c++) {
      const cellA = rowA.child(c);
      const cellB = rowB.child(c);
      if (cellA.type !== cellB.type || cellA.childCount !== cellB.childCount) {
        return false;
      }
    }
  }
  return true;
}

/** The cells of a table node, in document order, with their positions. `start` is the position of the start of the table content. */
function tableCells(table: Node, start: number) {
  const cells: { node: Node; pos: number }[] = [];
  table.forEach((row, rowOffset) => {
    row.forEach((cell, cellOffset) => {
      // The row starts at `start + rowOffset`; its content starts one later.
      cells.push({ node: cell, pos: start + rowOffset + 1 + cellOffset });
    });
  });
  return cells;
}
