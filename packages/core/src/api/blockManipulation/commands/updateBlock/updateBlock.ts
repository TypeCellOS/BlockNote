import {
  Fragment,
  type NodeType,
  type Node as PMNode,
  Slice,
} from "prosemirror-model";
import { TextSelection, Transaction } from "prosemirror-state";
import { TableMap } from "prosemirror-tables";
import { ReplaceStep, Transform } from "prosemirror-transform";

import type { Block, PartialBlock } from "../../../../blocks/defaultBlocks.js";
import type {
  BlockIdentifier,
  BlockSchema,
} from "../../../../schema/blocks/types.js";
import type { InlineContentSchema } from "../../../../schema/inlineContent/types.js";
import type { StyleSchema } from "../../../../schema/styles/types.js";
import { UnreachableCaseError } from "../../../../util/typescript.js";
import {
  type BlockInfo,
  getBlockInfoFromResolvedPos,
} from "../../../getBlockInfoFromPos.js";
import {
  blockToNode,
  inlineContentToNodes,
  tableContentToNodes,
} from "../../../nodeConversions/blockToNode.js";
import { nodeToBlock } from "../../../nodeConversions/nodeToBlock.js";
import { getNodeById } from "../../../nodeUtil.js";
import { getPmSchema } from "../../../pmUtil.js";

// for compatibility with tiptap. TODO: remove as we want to remove dependency on tiptap command interface
export const updateBlockCommand = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  posBeforeBlock: number,
  block: PartialBlock<BSchema, I, S>,
) => {
  return ({
    tr,
    dispatch,
  }: {
    tr: Transaction;
    dispatch?: () => void;
  }): boolean => {
    if (dispatch) {
      updateBlockTr(tr, posBeforeBlock, block);
    }
    return true;
  };
};

export function updateBlockTr<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  tr: Transform | Transaction,
  posBeforeBlock: number,
  block: PartialBlock<BSchema, I, S>,
  replaceFromPos?: number,
  replaceToPos?: number,
) {
  const blockInfo = getBlockInfoFromResolvedPos(tr.doc.resolve(posBeforeBlock));

  let cellAnchor: CellAnchor | null = null;
  if (blockInfo.blockNoteType === "table") {
    cellAnchor = captureCellAnchor(tr);
  }

  const pmSchema = getPmSchema(tr);

  if (
    replaceFromPos !== undefined &&
    replaceToPos !== undefined &&
    replaceFromPos > replaceToPos
  ) {
    throw new Error("Invalid replaceFromPos or replaceToPos");
  }

  // Adds blockGroup node with child blocks if necessary.

  const oldNodeType = pmSchema.nodes[blockInfo.blockNoteType];
  const newNodeType = pmSchema.nodes[block.type || blockInfo.blockNoteType];
  const newBnBlockNodeType = newNodeType.isInGroup("bnBlock")
    ? newNodeType
    : pmSchema.nodes["blockContainer"];

  if (blockInfo.isBlockContainer && newNodeType.isInGroup("blockContent")) {
    const replaceFromOffset =
      replaceFromPos !== undefined &&
      replaceFromPos > blockInfo.blockContent.beforePos &&
      replaceFromPos < blockInfo.blockContent.afterPos
        ? replaceFromPos - blockInfo.blockContent.beforePos - 1
        : undefined;

    const replaceToOffset =
      replaceToPos !== undefined &&
      replaceToPos > blockInfo.blockContent.beforePos &&
      replaceToPos < blockInfo.blockContent.afterPos
        ? replaceToPos - blockInfo.blockContent.beforePos - 1
        : undefined;

    updateChildren(block, tr, blockInfo);
    // The code below determines the new content of the block.
    // or "keep" to keep as-is
    updateBlockContentNode(
      block,
      tr,
      oldNodeType,
      newNodeType,
      blockInfo,
      replaceFromOffset,
      replaceToOffset,
    );
  } else if (!blockInfo.isBlockContainer && newNodeType.isInGroup("bnBlock")) {
    updateChildren(block, tr, blockInfo);
    // old node was a bnBlock type (like column or columnList) and new block as well
    // No op, we just update the bnBlock below (at end of function) and have already updated the children
  } else {
    // switching from blockContainer to non-blockContainer or v.v.
    // currently breaking for column slash menu items converting empty block
    // to column.

    // currently, we calculate the new node and replace the entire node with the desired new node.
    // for this, we do a nodeToBlock on the existing block to get the children.
    // it would be cleaner to use a ReplaceAroundStep, but this is a bit simpler and it's quite an edge case
    const existingBlock = nodeToBlock(blockInfo.bnBlock.node, tr.doc);
    const replacementNode = blockToNode(
      {
        children: existingBlock.children, // if no children are passed in, use existing children
        ...block,
      },
      pmSchema,
    );
    replacementNode.check(); // `blockToNode` is lenient; validate before mutating the doc
    tr.replaceWith(
      blockInfo.bnBlock.beforePos,
      blockInfo.bnBlock.afterPos,
      replacementNode,
    );

    return;
  }

  // Adds all provided props as attributes to the parent blockContainer node too, and also preserves existing

  // attributes. Uses minimal steps so that an unchanged container (e.g. when
  // only children or content changed) doesn't emit a step at all.
  setNodeMarkupMinimal(tr, blockInfo.bnBlock.beforePos, newBnBlockNodeType, {
    ...block.props,
  });

  if (cellAnchor) {
    restoreCellAnchor(tr, blockInfo, cellAnchor);
  }
}

function updateBlockContentNode<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  block: PartialBlock<BSchema, I, S>,
  tr: Transform,
  oldNodeType: NodeType,
  newNodeType: NodeType,
  blockInfo: {
    childContainer?:
      | { node: PMNode; beforePos: number; afterPos: number }
      | undefined;
    blockContent: { node: PMNode; beforePos: number; afterPos: number };
  },
  replaceFromOffset?: number,
  replaceToOffset?: number,
) {
  const pmSchema = getPmSchema(tr);
  let content: PMNode[] | "keep" = "keep";

  // Has there been any custom content provided?
  if (block.content) {
    if (typeof block.content === "string") {
      // Adds a single text node with no marks to the content.
      content = inlineContentToNodes(
        [block.content],
        pmSchema,
        newNodeType.name,
      );
    } else if (Array.isArray(block.content)) {
      // Adds a text node with the provided styles converted into marks to the content,
      // for each InlineContent object.
      content = inlineContentToNodes(block.content, pmSchema, newNodeType.name);
    } else if (block.content.type === "tableContent") {
      content = tableContentToNodes(block.content, pmSchema);
    } else {
      throw new UnreachableCaseError(block.content.type);
    }
  } else {
    // no custom content has been provided, use existing content IF possible
    // Since some block types contain inline content and others don't,
    // we either need to call setNodeMarkup to just update type &
    // attributes, or replaceWith to replace the whole blockContent.
    if (oldNodeType.spec.content === "") {
      // keep old content, because it's empty anyway and should be compatible with
      // any newContentType
    } else if (newNodeType.spec.content !== oldNodeType.spec.content) {
      // the content type changed, replace the previous content
      content = [];
    } else {
      // keep old content, because the content type is the same and should be compatible
    }
  }

  // Now, changes the blockContent node type and adds the provided props
  // as attributes. Also preserves all existing attributes that are
  // compatible with the new type.
  //
  // Use either setNodeMarkup or replaceWith depending on whether the
  // content is being replaced or not.
  if (content === "keep") {
    // only update the type and attributes, keeping the content as-is
    setNodeMarkupMinimal(tr, blockInfo.blockContent.beforePos, newNodeType, {
      ...block.props,
    });
  } else if (replaceFromOffset !== undefined || replaceToOffset !== undefined) {
    // Update the markup of the containing node, then get its (possibly shifted)
    // position back.
    const contentBeforePos = setNodeMarkupMinimalAndRemap(
      tr,
      blockInfo.blockContent.beforePos,
      newNodeType,
      { ...block.props },
    );

    const start = contentBeforePos + 1 + (replaceFromOffset ?? 0);
    const end =
      contentBeforePos +
      1 +
      (replaceToOffset ?? blockInfo.blockContent.node.content.size);

    // for content like table cells (where the blockcontent has nested PM nodes),
    // we need to figure out the correct openStart and openEnd for the slice when replacing

    const contentDepth = tr.doc.resolve(contentBeforePos).depth;
    const startDepth = tr.doc.resolve(start).depth;
    const endDepth = tr.doc.resolve(end).depth;

    tr.replace(
      start,
      end,
      new Slice(
        Fragment.from(content),
        startDepth - contentDepth - 1,
        endDepth - contentDepth - 1,
      ),
    );
  } else if (
    newNodeType === oldNodeType ||
    newNodeType.validContent(blockInfo.blockContent.node.content)
  ) {
    // The new type can hold the existing content, so we can update the markup
    // first and then diff the content. This keeps both steps minimal.
    //
    // First update the markup (type & attributes) of the content node using
    // minimal steps (avoids replacing the whole node just to change attrs), then
    // get its (possibly shifted) position back.
    const contentBeforePos = setNodeMarkupMinimalAndRemap(
      tr,
      blockInfo.blockContent.beforePos,
      newNodeType,
      { ...block.props },
    );

    // Then replace only the part of the content that actually changed, keeping
    // any shared prefix/suffix untouched.
    replaceContentMinimal(tr, contentBeforePos, Fragment.from(content));
  } else {
    // The content type is incompatible with the new node type (e.g. switching
    // between inline content, table content, and no content). We can't update
    // the markup in-place, so replace the whole content node atomically.
    tr.replaceWith(
      blockInfo.blockContent.beforePos,
      blockInfo.blockContent.afterPos,
      newNodeType.createChecked(
        {
          ...blockInfo.blockContent.node.attrs,
          ...block.props,
        },
        content,
      ),
    );
  }
}

/**
 * Replaces the content of the node at `nodePos` with `newContent`, only
 * touching the range that actually differs between the old and new content.
 *
 * - For textblocks (inline content), this diffs at the character level using
 *   `Fragment.findDiffStart`/`findDiffEnd`, so e.g. changing a single word only
 *   replaces that word rather than the entire paragraph.
 * - For nested content (like tables or blockGroups), the diff is snapped to
 *   whole top-level children (rows / blocks), so only the changed children are
 *   replaced while unchanged leading/trailing children are left untouched.
 */
function replaceContentMinimal(
  tr: Transform,
  nodePos: number,
  newContent: Fragment,
) {
  const node = tr.doc.nodeAt(nodePos);
  if (!node) {
    throw new RangeError("No node at given position");
  }

  const oldContent = node.content;
  // Position of the first child inside the node.
  const contentStart = nodePos + 1;

  if (node.isTextblock) {
    // Inline content: diff at the character/token level. A flat slice (no open
    // depth) is valid because the children are inline leaves.
    const diffStart = oldContent.findDiffStart(newContent);
    if (diffStart === null) {
      return;
    }

    // `findDiffEnd` returns ends in TWO separate coordinate systems: `a` is an
    // offset into the OLD content, `b` is an offset into the NEW content. They
    // are NOT interchangeable when the two fragments differ in size.
    const diffEnd = oldContent.findDiffEnd(newContent)!;
    let { a: oldEnd, b: newEnd } = diffEnd;

    // The shared prefix (`diffStart`) and shared suffix can overlap, e.g. when
    // inserting/deleting a run of text at a boundary. When that happens an end
    // can fall before `diffStart`. Push the ends forward so neither precedes the
    // shared prefix, keeping the OLD and NEW ranges aligned by the same amount
    // (each coordinate system is checked independently, then the larger shift is
    // applied to both so the suffix stays in sync).
    const shift = Math.max(0, diffStart - oldEnd, diffStart - newEnd);
    if (shift > 0) {
      oldEnd += shift;
      newEnd += shift;
    }

    tr.replace(
      // OLD-doc range to remove: uses old-content offsets.
      contentStart + diffStart,
      contentStart + oldEnd,
      // Replacement: cut the NEW content using new-content offsets. `diffStart`
      // is valid here because it lies within the shared prefix (identical in
      // both fragments), and `newEnd` is a new-content offset.
      new Slice(newContent.cut(diffStart, newEnd), 0, 0),
    );
    return;
  }

  // Nested/block content (table rows, child blocks, ...): snap the diff to whole
  // top-level children so the replacement slice is always a valid sequence of
  // complete children (open depth 0).
  const oldChildCount = oldContent.childCount;
  const newChildCount = newContent.childCount;

  // Number of identical leading children.
  let startIndex = 0;
  while (
    startIndex < oldChildCount &&
    startIndex < newChildCount &&
    oldContent.child(startIndex).eq(newContent.child(startIndex))
  ) {
    startIndex++;
  }

  // Number of identical trailing children (not overlapping the shared prefix).
  let oldEndIndex = oldChildCount;
  let newEndIndex = newChildCount;
  while (
    oldEndIndex > startIndex &&
    newEndIndex > startIndex &&
    oldContent.child(oldEndIndex - 1).eq(newContent.child(newEndIndex - 1))
  ) {
    oldEndIndex--;
    newEndIndex--;
  }

  // Nothing changed.
  if (startIndex === oldEndIndex && startIndex === newEndIndex) {
    return;
  }

  // Convert child indices to document positions.
  let from = contentStart;
  for (let i = 0; i < startIndex; i++) {
    from += oldContent.child(i).nodeSize;
  }
  let to = from;
  for (let i = startIndex; i < oldEndIndex; i++) {
    to += oldContent.child(i).nodeSize;
  }

  // Collect the changed replacement children.
  const replacement: PMNode[] = [];
  for (let i = startIndex; i < newEndIndex; i++) {
    replacement.push(newContent.child(i));
  }

  // Use a strict ReplaceStep (rather than the lenient `tr.replace`) so that
  // invalid content for the parent node type (e.g. a columnList that would end
  // up with non-column children) throws instead of being silently coerced.
  tr.step(
    new ReplaceStep(from, to, new Slice(Fragment.from(replacement), 0, 0)),
  );
}

/**
 * Updates the type and/or attributes of the node at `pos` using the smallest
 * possible set of steps.
 *
 * - If neither the type nor any attribute changes, no step is emitted.
 * - If only attributes change (type stays the same), an `AttrStep` is emitted
 *   for each changed attribute. These are minimal steps that don't touch the
 *   node's content.
 * - If the type changes, `setNodeMarkup` is used, which keeps the node's content
 *   via a `ReplaceAroundStep`.
 */
function setNodeMarkupMinimal(
  tr: Transform,
  pos: number,
  newType: NodeType,
  newAttrs: Record<string, unknown>,
) {
  const node = tr.doc.nodeAt(pos);
  if (!node) {
    throw new RangeError("No node at given position");
  }

  // Only consider attributes that are actually valid for the target node type.
  // `block.props` may contain props that belong to the content node but not the
  // container (or vice versa), and these should be ignored here.
  const validAttrs = newType.spec.attrs ?? {};
  const filteredNewAttrs: Record<string, unknown> = {};
  for (const attr of Object.keys(newAttrs)) {
    if (attr in validAttrs) {
      filteredNewAttrs[attr] = newAttrs[attr];
    }
  }

  const mergedAttrs = { ...node.attrs, ...filteredNewAttrs };

  if (node.type === newType) {
    // Only emit AttrSteps for attributes that actually changed.
    for (const attr of Object.keys(mergedAttrs)) {
      if (mergedAttrs[attr] !== node.attrs[attr]) {
        tr.setNodeAttribute(pos, attr, mergedAttrs[attr]);
      }
    }
    return;
  }

  // Type changed - setNodeMarkup keeps the content via a ReplaceAroundStep.
  tr.setNodeMarkup(pos, newType, mergedAttrs);
}

/**
 * Applies a minimal markup update to the node at `pos`, then returns `pos`
 * re-mapped through only the steps that update added.
 *
 * `setNodeMarkupMinimal` may add a step (e.g. a ReplaceAroundStep when the node
 * type changes), which leaves the original `pos` stale. Because `tr` may already
 * contain steps from earlier ops (other `updateBlock` calls sharing the same
 * transaction), we map through only the steps added here — not the whole
 * `tr.mapping` — using a -1 (before) bias so the position stays anchored before
 * the node rather than being pushed past it.
 */
function setNodeMarkupMinimalAndRemap(
  tr: Transform,
  pos: number,
  newType: NodeType,
  newAttrs: Record<string, unknown>,
): number {
  const baseMapLen = tr.mapping.maps.length;
  setNodeMarkupMinimal(tr, pos, newType, newAttrs);
  return tr.mapping.slice(baseMapLen).map(pos, -1);
}

function updateChildren<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(block: PartialBlock<BSchema, I, S>, tr: Transform, blockInfo: BlockInfo) {
  const pmSchema = getPmSchema(tr);
  if (block.children !== undefined && block.children.length > 0) {
    const childNodes = block.children.map((child) => {
      const node = blockToNode(child, pmSchema);
      node.check(); // `blockToNode` is lenient; validate before mutating the doc
      return node;
    });

    // Checks if a blockGroup node already exists.
    if (blockInfo.childContainer) {
      // Replaces the child nodes in the existing blockGroup, only touching the
      // range that actually changed (keeping unchanged leading/trailing
      // children untouched).
      replaceContentMinimal(
        tr,
        blockInfo.childContainer.beforePos,
        Fragment.from(childNodes),
      );
    } else {
      if (!blockInfo.isBlockContainer) {
        throw new Error("impossible");
      }
      // Inserts a new blockGroup containing the child nodes created earlier.
      tr.insert(
        blockInfo.blockContent.afterPos,
        pmSchema.nodes["blockGroup"].createChecked({}, childNodes),
      );
    }
  }
}

export function updateBlock<
  BSchema extends BlockSchema = any,
  I extends InlineContentSchema = any,
  S extends StyleSchema = any,
>(
  tr: Transform,
  blockToUpdate: BlockIdentifier,
  update: PartialBlock<BSchema, I, S>,
  replaceFromPos?: number,
  replaceToPos?: number,
): Block<BSchema, I, S> {
  const id =
    typeof blockToUpdate === "string" ? blockToUpdate : blockToUpdate.id;
  const posInfo = getNodeById(id, tr.doc);
  if (!posInfo) {
    throw new Error(`Block with ID ${id} not found`);
  }

  updateBlockTr(
    tr,
    posInfo.posBeforeNode,
    update,
    replaceFromPos,
    replaceToPos,
  );

  const blockContainerNode = tr.doc
    .resolve(posInfo.posBeforeNode + 1) // TODO: clean?
    .node();

  return nodeToBlock(blockContainerNode, tr.doc);
}

type CellAnchor = { row: number; col: number; offset: number };

/**
 * Captures the cell anchor from the current selection.
 * @param tr - The transaction to capture the cell anchor from.
 *
 * @returns The cell anchor, or null if no cell is selected.
 */
export function captureCellAnchor(tr: Transform): CellAnchor | null {
  const sel = "selection" in tr ? tr.selection : null;
  if (!(sel instanceof TextSelection)) {
    return null;
  }

  const $head = tr.doc.resolve(sel.head);
  // Find enclosing cell and table
  let cellDepth = -1;
  let tableDepth = -1;
  for (let d = $head.depth; d >= 0; d--) {
    const name = $head.node(d).type.name;
    if (cellDepth < 0 && (name === "tableCell" || name === "tableHeader")) {
      cellDepth = d;
    }
    if (name === "table") {
      tableDepth = d;
      break;
    }
  }
  if (cellDepth < 0 || tableDepth < 0) {
    return null;
  }

  // Absolute positions (before the cell)
  const cellPos = $head.before(cellDepth);
  const tablePos = $head.before(tableDepth);
  const table = tr.doc.nodeAt(tablePos);
  if (!table || table.type.name !== "table") {
    return null;
  }

  // Visual grid position via TableMap (handles spans)
  const map = TableMap.get(table);
  const rel = cellPos - (tablePos + 1); // relative to inside table
  const idx = map.map.indexOf(rel);
  if (idx < 0) {
    return null;
  }

  const row = Math.floor(idx / map.width);
  const col = idx % map.width;

  // Caret offset relative to the start of paragraph text
  const paraPos = cellPos + 1; // pos BEFORE tableParagraph
  const textStart = paraPos + 1; // start of paragraph text
  const offset = Math.max(0, sel.head - textStart);

  return { row, col, offset };
}

function restoreCellAnchor(
  tr: Transform | Transaction,
  blockInfo: BlockInfo,
  a: CellAnchor,
): boolean {
  if (blockInfo.blockNoteType !== "table") {
    return false;
  }

  // 1) Resolve the table node in the current document
  let tablePos = -1;

  if (blockInfo.isBlockContainer) {
    // Prefer the blockContent position when available (points directly at the PM table node)
    tablePos = tr.mapping.map(blockInfo.blockContent.beforePos);
  } else {
    // Fallback: scan within the mapped bnBlock range to find the inner table node
    const start = tr.mapping.map(blockInfo.bnBlock.beforePos);
    const end = start + (tr.doc.nodeAt(start)?.nodeSize || 0);
    tr.doc.nodesBetween(start, end, (node, pos) => {
      if (node.type.name === "table") {
        tablePos = pos;
        return false;
      }
      return true;
    });
  }

  const table = tablePos >= 0 ? tr.doc.nodeAt(tablePos) : null;
  if (!table || table.type.name !== "table") {
    return false;
  }

  // 2) Clamp row/col to the table’s current grid
  const map = TableMap.get(table);
  const row = Math.max(0, Math.min(a.row, map.height - 1));
  const col = Math.max(0, Math.min(a.col, map.width - 1));

  // 3) Compute the absolute position of the target cell (pos BEFORE the cell)
  const cellIndex = row * map.width + col;
  const relCellPos = map.map[cellIndex]; // relative to (tablePos + 1)
  if (relCellPos == null) {
    return false;
  }
  const cellPos = tablePos + 1 + relCellPos;

  // 4) Place the caret inside the cell, clamping the text offset
  const textPos = cellPos + 1;
  const textNode = tr.doc.nodeAt(textPos);
  const textStart = textPos + 1;
  const max = textNode ? textNode.content.size : 0;
  const head = textStart + Math.max(0, Math.min(a.offset, max));

  if ("selection" in tr) {
    tr.setSelection(TextSelection.create(tr.doc, head));
  }
  return true;
}
