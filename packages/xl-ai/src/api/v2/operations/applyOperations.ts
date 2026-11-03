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
import { applyToBlocks, type BlockShape } from "./applyToBlocks.js";
import { addInlineContentSteps } from "./inlineSteps.js";
import type { BlockOperation } from "./types.js";

/**
 * Applies the operations to the editor in sequence, in one transaction.
 * Returns the ProseMirror steps of the transaction.
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
  dispatchToEditor(editor, tr.steps);
  return [...tr.steps];
}

/**
 * Dispatches the steps to the editor, in one transaction. The steps come
 * from a text or from operations, not from a user who types. Thus, the
 * transaction has the meta `preventAutolink`: the autolink plugin of the
 * editor must not change a URL of the text into a link.
 */
export function dispatchToEditor(
  editor: BlockNoteEditor<any, any, any>,
  steps: readonly Step[],
) {
  if (steps.length === 0) {
    return;
  }
  editor.transact((tr) => {
    tr.setMeta("preventAutolink", true);
    for (const step of steps) {
      tr.step(step);
    }
  });
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
 *   result (see `applyToBlocks`). Each block whose children change is
 *   replaced, in one step, with its new children: the ProseMirror nodes of
 *   the blocks that the document has (a moved block keeps its node, with
 *   its comments), and new nodes. A step with a valid result is never
 *   filled with new blocks.
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
 * Makes the structure of the document agree with `target`: each block whose
 * children (by ID) are different is replaced with a node with the new
 * children. The replacements go from the last one to the first, thus each
 * position stays correct. A replaced block contains all changes below it.
 */
function applyStructure(tr: Transaction, target: BlockShape[]) {
  const schema = tr.doc.type.schema;
  const nodes = new Map<string, { node: Node; pos: number }>();
  tr.doc.descendants((node, pos) => {
    if (node.type.isInGroup("bnBlock")) {
      nodes.set(node.attrs.id, { node, pos });
    }
    return !node.isTextblock;
  });

  const replacements: { from: number; to: number; nodes: Node[] }[] = [];
  const rootGroup = tr.doc.firstChild;
  if (rootGroup === null) {
    throw new Error("The document has no block group");
  }
  if (!sameChildren(childBlocks(rootGroup), target)) {
    const blocks = target.map(build);
    replacements.push({
      from: 1,
      to: 1 + rootGroup.content.size,
      // A document always has one block.
      nodes:
        blocks.length > 0
          ? blocks
          : [schema.nodes["blockContainer"].createAndFill()!],
    });
  } else {
    findReplacements(target);
  }
  replacements.sort((a, b) => b.from - a.from);
  for (const { from, to, nodes: content } of replacements) {
    tr.step(new ReplaceStep(from, to, new Slice(Fragment.from(content), 0, 0)));
  }

  /** Adds a replacement for each block whose children are different, at the top of each changed subtree. */
  function findReplacements(shapes: readonly BlockShape[]) {
    for (const shape of shapes) {
      const found = existing(shape.block.id);
      if (sameChildren(childBlocks(found.node), shape.children)) {
        findReplacements(shape.children);
      } else {
        replacements.push({
          from: found.pos,
          to: found.pos + found.node.nodeSize,
          nodes: [build(shape)],
        });
      }
    }
  }

  function existing(id: string) {
    const found = nodes.get(id);
    if (found === undefined) {
      throw new Error(`Block ${id} is not in the document`);
    }
    return found;
  }

  /** Returns true if the nodes are the blocks of the shapes, in order. */
  function sameChildren(
    blocks: readonly Node[],
    shapes: readonly BlockShape[],
  ) {
    return (
      blocks.length === shapes.length &&
      blocks.every((block, i) => block.attrs.id === shapes[i].block.id)
    );
  }

  /** Returns true if the node has the structure of the shape, at all depths. */
  function sameStructure(node: Node, shape: BlockShape): boolean {
    const children = childBlocks(node);
    return (
      sameChildren(children, shape.children) &&
      children.every((child, i) => sameStructure(child, shape.children[i]))
    );
  }

  /** The node of the shape: the node of the document if its structure is the same, else a new node with the nodes of its children. */
  function build(shape: BlockShape): Node {
    const found = nodes.get(shape.block.id);
    if (found !== undefined && sameStructure(found.node, shape)) {
      return found.node;
    }
    const shell =
      found?.node ??
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
