import { Plugin } from "prosemirror-state";
import { dropPoint } from "prosemirror-transform";
import type { EditorView } from "prosemirror-view";
import {
  applyOrientationClasses,
  getBlockDropRect,
  getInlineDropRect,
  getParentOffsets,
  hasExclusionClassname,
  type DropCursorPosition,
} from "./utils.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { createExtension } from "../../editor/BlockNoteExtension.js";
import { getDropIntoChildren } from "./dropIntoChildren.js";

export const DRAG_EXCLUSION_CLASSNAME = "bn-drag-exclude";

/**
 * Context passed to the computeDropPosition hook.
 */
export interface ComputeDropPositionContext {
  editor: BlockNoteEditor<any, any, any>;
  event: DragEvent;
  view: EditorView;
  defaultPosition: DropCursorPosition | null;
}

/**
 * Hooks for customizing drop cursor behavior.
 */
export interface DropCursorHooks {
  /**
   * Compute cursor position and orientation.
   * Return null to prevent dropping (no cursor shown).
   */
  computeDropPosition?: (
    context: ComputeDropPositionContext,
  ) => DropCursorPosition | null;
}

/**
 * Options for the DropCursor extension.
 */
export interface DropCursorOptions {
  width?: number; // Cursor width in pixels (default: 5)
  color?: string | false; // Cursor color (default: "#ddeeff")
  exclude?: string; // CSS class for exclusion (default: "bn-drag-exclude")
  hooks?: DropCursorHooks; // Optional behavior hooks
}

/**
 * Drop cursor visualization based on prosemirror-dropcursor:
 * https://github.com/ProseMirror/prosemirror-dropcursor/blob/master/src/dropcursor.ts
 *
 * Refactored to use BlockNote extension pattern with mount callback and AbortSignal
 * for lifecycle management instead of ProseMirror PluginView.
 */
export const DropCursorExtension = createExtension<
  any,
  {
    dropCursor?: DropCursorOptions;
  }
>(({ editor, options }) => {
  // State
  let cursorPos: DropCursorPosition | null = null;
  let element: HTMLElement | null = null;
  let timeout = -1;
  let dragSourceElement: Element | null = null;
  // The block the drop goes into, if any, as the cursor shows it. Its
  // element is highlighted like a selected block.
  let dropInto:
    | { blockId: string; draggedBlocks: any[]; element: HTMLElement }
    | undefined;

  const config = {
    width: options.dropCursor?.width ?? 5,
    color: options.dropCursor?.color ?? "#ddeeff",
    exclude: options.dropCursor?.exclude ?? DRAG_EXCLUSION_CLASSNAME,
    hooks: options.dropCursor?.hooks,
  } as const;

  // Helper functions
  const setDropInto = (into: typeof dropInto) => {
    delete dropInto?.element.dataset.dropTarget;
    dropInto = into;
    if (dropInto) {
      dropInto.element.dataset.dropTarget = "true";
    }
  };

  const setCursor = (pos: DropCursorPosition | null) => {
    if (
      pos?.pos === cursorPos?.pos &&
      pos?.orientation === cursorPos?.orientation
    ) {
      return;
    }
    cursorPos = pos;

    if (pos == null) {
      setDropInto(undefined);
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
      element = null;
    } else {
      updateOverlay();
    }
  };

  const updateOverlay = () => {
    if (!cursorPos) {
      return;
    }

    const view = editor.prosemirrorView;
    const editorDOM = view.dom;
    const editorRect = editorDOM.getBoundingClientRect();
    const scaleX = editorRect.width / editorDOM.offsetWidth;
    const scaleY = editorRect.height / editorDOM.offsetHeight;

    const blockRect = getBlockDropRect(
      view,
      cursorPos,
      config.width,
      scaleX,
      scaleY,
    );
    const rect =
      blockRect ?? getInlineDropRect(view, cursorPos, config.width, scaleX);

    const parent = view.dom.offsetParent as HTMLElement;
    if (!element) {
      element = parent.appendChild(document.createElement("div"));
      element.style.cssText =
        "position: absolute; z-index: 50; pointer-events: none;";
      if (config.color) {
        element.style.backgroundColor = config.color;
      }
    }

    applyOrientationClasses(element, cursorPos.orientation);

    const { parentLeft, parentTop } = getParentOffsets(parent);

    element.style.left = (rect.left - parentLeft) / scaleX + "px";
    element.style.top = (rect.top - parentTop) / scaleY + "px";
    element.style.width = (rect.right - rect.left) / scaleX + "px";
    element.style.height = (rect.bottom - rect.top) / scaleY + "px";
  };

  const scheduleRemoval = (ms: number) => {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => setCursor(null), ms);
  };

  // Event handlers
  const onDragStart = (event: Event) => {
    const e = event as DragEvent;
    dragSourceElement = e.target instanceof Element ? e.target : null;
  };

  const onDragOver = (event: Event) => {
    const e = event as DragEvent;

    // Check if drag source has exclusion classname
    if (
      dragSourceElement &&
      hasExclusionClassname(dragSourceElement, config.exclude)
    ) {
      return;
    }

    // Check if drop target has exclusion classname
    if (
      e.target instanceof Element &&
      hasExclusionClassname(e.target, config.exclude)
    ) {
      return;
    }

    const view = editor.prosemirrorView;
    if (!view.editable) {
      return;
    }

    const pos = view.posAtCoords({
      left: e.clientX,
      top: e.clientY,
    });

    const node = pos && pos.inside >= 0 && view.state.doc.nodeAt(pos.inside);
    const disableDropCursor = node && (node.type.spec as any).disableDropCursor;
    const disabled =
      typeof disableDropCursor === "function"
        ? disableDropCursor(view, pos, e)
        : disableDropCursor;

    if (pos && !disabled) {
      let target = pos.pos;
      if (view.dragging && view.dragging.slice) {
        const point = dropPoint(view.state.doc, target, view.dragging.slice);
        if (point != null) {
          target = point;
        }
      }

      // Compute default position. A block dragged onto a block with
      // `meta.dropsIntoChildren` goes to the start of its children.
      const $pos = view.state.doc.resolve(target);
      const isBlock = !$pos.parent.inlineContent;
      const intoChildren = getDropIntoChildren(editor, view, {
        left: e.clientX,
        top: e.clientY,
      });
      const defaultPosition: DropCursorPosition = intoChildren
        ? { pos: intoChildren.pos, orientation: "block-horizontal" }
        : { pos: target, orientation: isBlock ? "block-horizontal" : "inline" };

      // Allow hook to override position
      let finalPosition = defaultPosition;
      if (config.hooks?.computeDropPosition) {
        const hookResult = config.hooks.computeDropPosition({
          editor,
          event: e,
          view,
          defaultPosition,
        });
        if (hookResult === null) {
          // Hook returned null - don't show cursor
          setCursor(null);
          return;
        }
        finalPosition = hookResult;
      }

      setCursor(finalPosition);
      // The drop goes into the block while the cursor shows the place of its
      // children. A hook may show another place instead (e.g. a new column).
      if (
        intoChildren &&
        finalPosition.pos === intoChildren.pos &&
        finalPosition.orientation === "block-horizontal"
      ) {
        const { block } = intoChildren.blockInfo;
        const element = view.nodeDOM(block.beforePos);
        if (!(element instanceof HTMLElement)) {
          throw new Error("A block in the document must have an element");
        }
        setDropInto({
          blockId: block.node.attrs.id,
          draggedBlocks: intoChildren.draggedBlocks,
          element,
        });
      } else {
        setDropInto(undefined);
      }
      scheduleRemoval(5000);
    }
  };

  const onDragLeave = (event: Event) => {
    const e = event as DragEvent;
    if (
      !(e.relatedTarget instanceof Node) ||
      !editor.prosemirrorView.dom.contains(e.relatedTarget)
    ) {
      setCursor(null);
    }
  };

  const onDrop = () => {
    scheduleRemoval(20);
  };

  const onDragEnd = () => {
    scheduleRemoval(20);
    dragSourceElement = null;
  };

  // Drops the blocks where the cursor shows them: as the first children of
  // the block it goes into. Other drops are ProseMirror's.
  const dropIntoChildrenPlugin = new Plugin({
    props: {
      handleDrop(_view, _event, _slice, moved) {
        if (!dropInto) {
          return false;
        }
        const { blockId, draggedBlocks } = dropInto;
        editor.transact(() => {
          if (moved) {
            // A drag from another editor leaves its blocks there.
            editor.removeBlocks(
              draggedBlocks.filter((block) => editor.getBlock(block.id)),
            );
          }
          const target = editor.getBlock(blockId)!;
          if (target.children.length > 0) {
            editor.insertBlocks(draggedBlocks, target.children[0], "before");
          } else {
            editor.updateBlock(target, { children: draggedBlocks });
          }
        });
        return true;
      },
    },
  });

  return {
    key: "dropCursor",
    prosemirrorPlugins: [dropIntoChildrenPlugin],
    mount({ signal, dom, root }) {
      // Track drag source at document level
      root.addEventListener("dragstart", onDragStart, {
        capture: true,
        signal,
      });

      // Handle drag events on the editor
      dom.addEventListener("dragover", onDragOver, { signal });
      dom.addEventListener("dragleave", onDragLeave, { signal });
      dom.addEventListener("drop", onDrop, { signal });
      dom.addEventListener("dragend", onDragEnd, { signal });

      // Clean up on unmount
      signal.addEventListener("abort", () => {
        clearTimeout(timeout);
        setCursor(null);
      });
    },
  } as const;
});
