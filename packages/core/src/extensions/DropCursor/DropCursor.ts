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

  const config = {
    width: options.dropCursor?.width ?? 5,
    color: options.dropCursor?.color ?? "#ddeeff",
    exclude: options.dropCursor?.exclude ?? DRAG_EXCLUSION_CLASSNAME,
    hooks: options.dropCursor?.hooks,
  } as const;

  // Helper functions
  const setCursor = (pos: DropCursorPosition | null) => {
    if (
      pos?.pos === cursorPos?.pos &&
      pos?.orientation === cursorPos?.orientation
    ) {
      return;
    }
    cursorPos = pos;

    if (pos == null) {
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

      // Compute default position
      const $pos = view.state.doc.resolve(target);
      const isBlock = !$pos.parent.inlineContent;
      const defaultPosition: DropCursorPosition = {
        pos: target,
        orientation: isBlock ? "block-horizontal" : "inline",
      };

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

  return {
    key: "dropCursor",
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
