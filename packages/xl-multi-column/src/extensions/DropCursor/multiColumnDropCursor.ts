import {
  type DropCursorHooks,
  getNearestBlockPos,
  isContainerNode,
} from "@blocknote/core";
import type { EditorState } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

const PERCENTAGE_OF_BLOCK_WIDTH_CONSIDERED_SIDE_DROP = 0.1;

export interface EdgeDropPosition {
  position: "left" | "right" | "regular";
  posBeforeNode: number;
  node: any;
}

/**
 * Detects if the drop event is near the left or right edge of a block.
 * Shared utility used by both the drop cursor visualization and the drop handler.
 * Returns null when the event position cannot be resolved (e.g. drop outside editor bounds).
 */
export function detectEdgePosition(
  event: DragEvent,
  view: EditorView,
  state: EditorState,
): EdgeDropPosition | null {
  const eventPos = view.posAtCoords({
    left: event.clientX,
    top: event.clientY,
  });

  if (!eventPos) {
    return null;
  }

  const blockPos = getNearestBlockPos(state.doc, eventPos.pos);

  // If we're at a block inside a column of a columnList, we want to compare
  // the mouse position to the column, not the block inside it.
  // Why? Because we want to insert a new sibling column in the columnList
  // instead of a new container inside the column.
  let resolved = state.doc.resolve(blockPos.posBeforeNode);
  if (
    isContainerNode(resolved.parent.type) &&
    resolved.depth > 0 &&
    state.doc.resolve(resolved.before()).parent.type.name === "columnList"
  ) {
    resolved = state.doc.resolve(resolved.before());
  }

  const posInfo = {
    posBeforeNode: resolved.pos,
    node: resolved.nodeAfter!,
  };

  const blockElement = view.nodeDOM(posInfo.posBeforeNode);
  if (blockElement === null) {
    return {
      position: "regular",
      posBeforeNode: posInfo.posBeforeNode,
      node: posInfo.node,
    };
  }
  const blockRect = (blockElement as HTMLElement).getBoundingClientRect();

  let position: "regular" | "left" | "right" = "regular";

  if (event.clientX <= blockRect.left) {
    // for left edge, there's no margin to consider (drop must be to left of the block)
    position = "left";
  } else if (
    event.clientX >=
    blockRect.right -
      blockRect.width * PERCENTAGE_OF_BLOCK_WIDTH_CONSIDERED_SIDE_DROP
  ) {
    position = "right";
  }

  return {
    position,
    posBeforeNode: posInfo.posBeforeNode,
    node: posInfo.node,
  };
}

/**
 * Creates the computeDropPosition hook for multi-column support.
 * This hook detects edge drops and returns vertical cursor orientations.
 */
export const multiColumnDropCursor: { hooks: DropCursorHooks } = {
  hooks: {
    computeDropPosition: (context) => {
      const edgePos = detectEdgePosition(
        context.event,
        context.view,
        context.view.state,
      );

      // Fall back to default when position cannot be resolved
      if (edgePos === null) {
        return context.defaultPosition;
      }

      // If it's a regular (non-edge) drop, use the default position
      if (edgePos.position === "regular") {
        return context.defaultPosition;
      }

      // Edge drop - show vertical cursor
      return {
        pos: edgePos.posBeforeNode,
        orientation:
          edgePos.position === "left"
            ? "block-vertical-left"
            : "block-vertical-right",
      };
    },
  },
};
