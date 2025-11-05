import { BlockNoteEditor, getNodeById } from "@blocknote/core";
import { VirtualElement } from "@floating-ui/utils";
import { posToDOMRect } from "@tiptap/core";
import { useEditorState } from "./useEditorState.js";

/**
 * Flattens a DOMRect to the nearest integer values
 */
export function flattenDOMRect(domRect: DOMRect): DOMRect {
  const { x, y, width, height } = domRect;
  return new DOMRect(
    Math.round(x),
    Math.round(y),
    Math.round(width),
    Math.round(height),
  );
}

/**
 * Based on a position (or range), returns a virtual element that can be used as a reference for floating UI.
 */
export function useVirtualElementAtPos(
  editor: BlockNoteEditor<any, any, any>,
  whichPos: (ctx: { editor: BlockNoteEditor<any, any, any> }) =>
    | undefined
    | {
        // TODO use the location API for this
        from: number;
        to?: number;
        element?: HTMLElement;
      },
): VirtualElement | undefined {
  const { domRect, contextElement } = useEditorState({
    editor,
    selector: (ctx) => {
      const range = whichPos(ctx);
      if (!range) {
        return { domRect: undefined, contextElement: undefined };
      }
      return {
        // flatten to JSON to avoid re-renders
        domRect: flattenDOMRect(
          posToDOMRect(
            editor.prosemirrorView,
            range.from,
            range.to ?? range.from,
          ),
        ),
        contextElement: range.element ?? editor.prosemirrorView.dom,
      };
    },
  });

  if (!domRect) {
    return undefined;
  }

  return {
    getBoundingClientRect: () => domRect,
    contextElement,
  };
}

/**
 * Gets a virtual element at a block (either before, after, or across the block)
 */
export function useVirtualElementAtBlock(
  editor: BlockNoteEditor<any, any, any>,
  blockID: string,
  placement: "before" | "after" | "across" = "across",
): VirtualElement | undefined {
  return useVirtualElementAtPos(editor, () => {
    return editor.transact((tr) => {
      // TODO use the location API for this
      const nodePosInfo = getNodeById(blockID, tr.doc);
      if (!nodePosInfo) {
        return undefined;
      }

      const startPos = nodePosInfo.posBeforeNode + 1;
      const endPos =
        nodePosInfo.posBeforeNode + nodePosInfo.node.content.size + 1;
      // TODO should not need to know the DOM structure here
      const blockElement = editor.prosemirrorView.dom.querySelector(
        `[data-id="${blockID}"]`,
      );

      switch (placement) {
        case "before": {
          return {
            from: startPos,
            contextElement: blockElement,
          };
        }
        case "after": {
          return {
            from: endPos,
            contextElement: blockElement,
          };
        }
        case "across": {
          return {
            from: startPos,
            to: endPos,
            contextElement: blockElement,
          };
        }
        default: {
          throw new Error(`Invalid placement: ${placement}`);
        }
      }
    });
  });
}

// I'm unsure at this point whether the above should be implemented as a hook, or just as utility functions (and on call of `getBoundingClientRect` it can calculate the DOMRect)
// But, I think that the principle will be the same, select what we need as positions, and then calculate the DOMRect on demand, re-evaluate when we need to.
// These should be able to help with hooks that can actually position a menu at a given position.
