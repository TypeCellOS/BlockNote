import type { Node as PMNode, Slice } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";

import { materializeChildren } from "../../api/blockManipulation/commands/materializeChildren/materializeChildren.js";
import {
  getBlockInfoFromNode,
  getNearestBlockPos,
} from "../../api/getBlockInfoFromPos.js";

/** The whole blocks `slice` consists of, if that's all it is. */
function getSliceBlocks(slice: Slice | undefined | null): PMNode[] | undefined {
  if (!slice || slice.openStart !== 0 || slice.openEnd !== 0) {
    return undefined;
  }

  const blocks: PMNode[] = [];
  slice.content.forEach((node) => blocks.push(node));

  return blocks.length > 0 &&
    blocks.every((node) => node.type.isInGroup("blockGroupChild"))
    ? blocks
    : undefined;
}

/**
 * The position of a block a drop should land *inside* of rather than next to —
 * an expanded, childless collapsible block, whose missing `blockGroup` leaves
 * `dropPoint` nothing to find. The drop cursor and the drop handler both come
 * through here, so they can't disagree.
 */
export function getToggleDropTargetPos(
  isExpanded: (id: string) => boolean | undefined,
  view: EditorView,
  event: { clientX: number; clientY: number },
  slice: Slice | undefined | null,
): number | undefined {
  if (!view.editable || !getSliceBlocks(slice)) {
    return undefined;
  }

  const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (!coords) {
    return undefined;
  }

  const blockPos = getNearestBlockPos(
    view.state.doc,
    coords.inside >= 0 ? coords.inside : coords.pos,
  );
  const info = getBlockInfoFromNode(blockPos.node, blockPos.posBeforeNode);

  if (
    !info.hasContent ||
    info.children ||
    !info.block.node.attrs.id ||
    !isExpanded(info.block.node.attrs.id)
  ) {
    return undefined;
  }

  // Only over the block's own content, so the space below it stays a normal
  // "drop as a sibling" region.
  const contentDOM = view.nodeDOM(info.content.beforePos);
  if (!(contentDOM instanceof HTMLElement)) {
    return undefined;
  }

  const rect = contentDOM.getBoundingClientRect();

  return event.clientY < rect.top || event.clientY > rect.bottom
    ? undefined
    : blockPos.posBeforeNode;
}

/**
 * Drops the dragged blocks into the block under the pointer, as its children.
 *
 * @returns Whether the drop was handled.
 */
export function handleToggleDrop(
  targetPos: number | undefined,
  view: EditorView,
  event: Pick<DragEvent, "preventDefault">,
  slice: Slice | undefined | null,
  moved: boolean,
): boolean {
  const blocks = getSliceBlocks(slice);
  if (targetPos === undefined || !blocks) {
    return false;
  }

  // Without one there's nothing to check the target against below, so the drop
  // would land at a position nothing has vouched for.
  const targetId = view.state.doc.nodeAt(targetPos)?.attrs.id;
  if (!targetId) {
    return false;
  }

  const tr = view.state.tr;

  if (moved) {
    tr.deleteSelection();
  }

  const mappedPos = tr.mapping.map(targetPos);
  // Dragging a block onto itself deletes the drop target, so there's nothing
  // left to drop into.
  if (tr.doc.nodeAt(mappedPos)?.attrs.id !== targetId) {
    return false;
  }

  if (materializeChildren(tr, mappedPos, blocks) === undefined) {
    return false;
  }
  view.dispatch(tr.setMeta("uiEvent", "drop"));
  event.preventDefault();

  return true;
}
