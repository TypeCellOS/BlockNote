import type { Node as PMNode, Slice } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";

import { materializeChildren } from "../../api/blockManipulation/commands/materializeChildren/materializeChildren.js";
import {
  getBlockInfo,
  getNearestBlockPos,
} from "../../api/getBlockInfoFromPos.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { isBlockCollapsible } from "./Collapsible.js";

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
export function getCollapsibleDropTargetPos(
  editor: BlockNoteEditor<any, any, any>,
  isExpanded: (id: string) => boolean,
  view: EditorView,
  event: { clientX: number; clientY: number },
  slice: Slice | undefined | null,
): number | undefined {
  if (!editor.isEditable || !getSliceBlocks(slice)) {
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
  const info = getBlockInfo(blockPos);

  if (
    !info.isBlockContainer ||
    info.childContainer ||
    !info.bnBlock.node.attrs.id ||
    !isBlockCollapsible(
      editor,
      info.blockNoteType,
      info.blockContent.node.attrs,
    ) ||
    !isExpanded(info.bnBlock.node.attrs.id)
  ) {
    return undefined;
  }

  // Only over the block's own content, so the space below it stays a normal
  // "drop as a sibling" region.
  const contentDOM = view.nodeDOM(info.blockContent.beforePos);
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
export function handleCollapsibleDrop(
  targetPos: number | undefined,
  view: EditorView,
  event: DragEvent,
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

  materializeChildren(tr, mappedPos, blocks);
  view.dispatch(tr.setMeta("uiEvent", "drop"));
  event.preventDefault();

  return true;
}
