import { dropPoint } from "prosemirror-transform";
import { createExtension } from "../../editor/BlockNoteExtension.js";

export const DRAG_EXCLUSION_CLASSNAME = "bn-drag-exclude";

/**
 * Checks if the element or any of its ancestors has the exclusion classname.
 * Elements with this classname and their descendants won't trigger the drop cursor.
 */
function hasExclusionClassname(element: Element | null): boolean {
  if (!element) {
    return false;
  }
  return !!element.closest(`.${DRAG_EXCLUSION_CLASSNAME}`);
}

/**
 * Drop cursor visualization based on prosemirror-dropcursor:
 * https://github.com/ProseMirror/prosemirror-dropcursor/blob/master/src/dropcursor.ts
 *
 * Refactored to use BlockNote extension pattern with mount callback and AbortSignal
 * for lifecycle management instead of ProseMirror PluginView.
 */
export const DropCursorExtension = createExtension(({ editor }) => {
  // State
  let cursorPos: number | null = null;
  let element: HTMLElement | null = null;
  let timeout = -1;
  let dragSourceElement: Element | null = null;

  const options = {
    width: 5,
    color: "#ddeeff",
  };

  // Helper functions
  const setCursor = (pos: number | null) => {
    if (pos === cursorPos) {
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
    const view = editor.prosemirrorView;
    const $pos = view.state.doc.resolve(cursorPos!);
    const isBlock = !$pos.parent.inlineContent;
    let rect: { left: number; right: number; top: number; bottom: number };

    const editorDOM = view.dom;
    const editorRect = editorDOM.getBoundingClientRect();
    const scaleX = editorRect.width / editorDOM.offsetWidth;
    const scaleY = editorRect.height / editorDOM.offsetHeight;

    if (isBlock) {
      const before = $pos.nodeBefore;
      const after = $pos.nodeAfter;
      if (before || after) {
        const node = view.nodeDOM(
          cursorPos! - (before ? before.nodeSize : 0),
        ) as HTMLElement | null;
        if (node) {
          const nodeRect = node.getBoundingClientRect();
          let top = before ? nodeRect.bottom : nodeRect.top;
          if (before && after) {
            top =
              (top +
                (
                  view.nodeDOM(cursorPos!) as HTMLElement
                ).getBoundingClientRect().top) /
              2;
          }
          const halfWidth = (options.width / 2) * scaleY;
          rect = {
            left: nodeRect.left,
            right: nodeRect.right,
            top: top - halfWidth,
            bottom: top + halfWidth,
          };
        }
      }
    }

    if (!rect!) {
      const coords = view.coordsAtPos(cursorPos!);
      const halfWidth = (options.width / 2) * scaleX;
      rect = {
        left: coords.left - halfWidth,
        right: coords.left + halfWidth,
        top: coords.top,
        bottom: coords.bottom,
      };
    }

    const parent = view.dom.offsetParent as HTMLElement;
    if (!element) {
      element = parent.appendChild(document.createElement("div"));
      element.style.cssText =
        "position: absolute; z-index: 50; pointer-events: none;";
      if (options.color) {
        element.style.backgroundColor = options.color;
      }
    }
    element.classList.toggle("prosemirror-dropcursor-block", isBlock);
    element.classList.toggle("prosemirror-dropcursor-inline", !isBlock);

    let parentLeft: number, parentTop: number;
    if (
      !parent ||
      (parent === document.body &&
        getComputedStyle(parent).position === "static")
    ) {
      parentLeft = -window.pageXOffset;
      parentTop = -window.pageYOffset;
    } else {
      const parentRect = parent.getBoundingClientRect();
      const parentScaleX = parentRect.width / parent.offsetWidth;
      const parentScaleY = parentRect.height / parent.offsetHeight;
      parentLeft = parentRect.left - parent.scrollLeft * parentScaleX;
      parentTop = parentRect.top - parent.scrollTop * parentScaleY;
    }

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
    if (dragSourceElement && hasExclusionClassname(dragSourceElement)) {
      return;
    }

    // Check if drop target has exclusion classname
    if (e.target instanceof Element && hasExclusionClassname(e.target)) {
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
      setCursor(target);
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
        setCursor(null);
      });
    },
  } as const;
});
