import { type DropCursorHooks, getNearestBlockPos } from "@blocknote/core";
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
 */
export function detectEdgePosition(
  event: DragEvent,
  view: EditorView,
  state: EditorState,
): EdgeDropPosition {
  const eventPos = view.posAtCoords({
    left: event.clientX,
    top: event.clientY,
  });

  if (!eventPos) {
    throw new Error("Could not get event position");
  }

  const blockPos = getNearestBlockPos(state.doc, eventPos.pos);

  // If we're at a block that's in a column, we want to compare the mouse position to the column, not the block inside it
  // Why? Because we want to insert a new column in the columnList, instead of a new columnList inside of the column
  let resolved = state.doc.resolve(blockPos.posBeforeNode);
  if (resolved.parent.type.name === "column") {
    resolved = state.doc.resolve(resolved.before());
  }

  const posInfo = {
    posBeforeNode: resolved.pos,
    node: resolved.nodeAfter!,
  };

  const blockElement = view.nodeDOM(posInfo.posBeforeNode);
  const blockRect = (blockElement as HTMLElement).getBoundingClientRect();

  let position: "regular" | "left" | "right" = "regular";

  if (
    event.clientX <=
    blockRect.left +
      blockRect.width * PERCENTAGE_OF_BLOCK_WIDTH_CONSIDERED_SIDE_DROP
  ) {
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
