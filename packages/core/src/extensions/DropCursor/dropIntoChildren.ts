import type { EditorView } from "prosemirror-view";

import { fragmentToBlocks } from "../../api/nodeConversions/fragmentToBlocks.js";
import { nodeToBlock } from "../../api/nodeConversions/nodeToBlock.js";
import { getBlockInfoFromNode } from "../../api/getBlockInfoFromPos.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

/**
 * Where a block drag at `coords` drops, when it is over the content or frame
 * chrome of a block with `meta.dropsIntoChildren`: the start of that block's
 * children, or its end when it has no children yet.
 *
 * @returns `undefined` when the drop goes before or after a block, as usual:
 * for a text drag, over a block's children, over a block without the
 * setting, or over one of the dragged blocks.
 */
export function getDropIntoChildren(
  editor: BlockNoteEditor<any, any, any>,
  view: EditorView,
  coords: { left: number; top: number },
) {
  const slice = view.dragging?.slice;
  // A block drag holds complete blocks (see `SideMenu.onDragStart`).
  if (!slice || slice.openStart > 0) {
    return undefined;
  }
  const draggedBlocks = fragmentToBlocks<any, any, any>(slice.content);
  const pos = view.posAtCoords(coords);
  if (draggedBlocks.length === 0 || !pos || pos.inside < 0) {
    return undefined;
  }

  // The innermost block around the pointer. Over its children group (e.g. a
  // gap between two children), the drop goes between them.
  const $inside = view.state.doc.resolve(pos.inside + 1);
  let depth = $inside.depth;
  while (depth > 0 && !$inside.node(depth).type.isInGroup("bnBlock")) {
    if ($inside.node(depth).type.name === "blockGroup") {
      return undefined;
    }
    depth--;
  }
  if (depth === 0) {
    return undefined;
  }
  const blockInfo = getBlockInfoFromNode(
    $inside.node(depth),
    $inside.before(depth),
  );
  if (!blockInfo.hasContent) {
    return undefined;
  }

  const dropsIntoChildren = editor.schema.blockSpecs[
    blockInfo.blockNoteType
  ]?.implementation.meta?.dropsIntoChildren?.(
    nodeToBlock(blockInfo.block.node, view.state.doc),
  );
  if (!dropsIntoChildren) {
    return undefined;
  }

  // A block can't be dropped into itself or into one of its descendants.
  const targetId = blockInfo.block.node.attrs.id;
  const containsTarget = (block: {
    id: string;
    children: { id: string; children: any[] }[];
  }): boolean => block.id === targetId || block.children.some(containsTarget);
  if (draggedBlocks.some(containsTarget)) {
    return undefined;
  }

  return {
    blockInfo,
    draggedBlocks,
    pos: blockInfo.children
      ? blockInfo.children.childrenStart
      : blockInfo.block.afterPos - 1,
  };
}
