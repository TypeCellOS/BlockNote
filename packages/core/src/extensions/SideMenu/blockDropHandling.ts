import { DOMParser, Slice } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";

import { distanceToRect } from "./sideMenuHover.js";

/** Marks events we dispatch ourselves, so the handlers ignore them. */
type SyntheticEvent = Event & { synthetic?: boolean };

function isSynthetic(event: Event): boolean {
  return (event as SyntheticEvent).synthetic === true;
}

/**
 * Finds the editor that a drag event is about, and the distance from the
 * event to the blocks of that editor. If the event target is in an editor,
 * that editor is the only candidate: where editors overlap, it is the editor
 * on top. Otherwise, the candidates are the editors within `dropMargin` of the
 * event, and it is the one closest to the event.
 *
 * `dropMargin` counts from the editor element, like `hoverMargin`. The
 * distance that picks the closest editor counts to its blocks: the drop lands
 * at the nearest block position, so with uneven editor padding, the editor
 * whose blocks are nearest is the right pick. A drop outside the blocks, even
 * in the editor's padding, is moved onto them.
 */
function findDropEditor(
  view: EditorView,
  event: DragEvent,
  dropMargin: number,
) {
  const point = { x: event.clientX, y: event.clientY };
  const target =
    event.target instanceof Element ? event.target.closest(".bn-editor") : null;
  const editors = target
    ? [target]
    : Array.from(view.root.querySelectorAll(".bn-editor")).filter(
        (editor) =>
          distanceToRect(point, editor.getBoundingClientRect()) <= dropMargin,
      );
  const coords = event;

  if (editors.length === 0) {
    return null;
  }

  let closestEditor = editors[0];
  let minDistance = Number.MAX_VALUE;

  for (const editor of editors) {
    const rect = editor
      .querySelector(".bn-block-group")!
      .getBoundingClientRect();

    const distanceX =
      coords.clientX < rect.left
        ? rect.left - coords.clientX
        : coords.clientX > rect.right
          ? coords.clientX - rect.right
          : 0;

    const distanceY =
      coords.clientY < rect.top
        ? rect.top - coords.clientY
        : coords.clientY > rect.bottom
          ? coords.clientY - rect.bottom
          : 0;

    const distance = Math.sqrt(Math.pow(distanceX, 2) + Math.pow(distanceY, 2));

    if (distance < minDistance) {
      minDistance = distance;
      closestEditor = editor;
    }
  }

  return { element: closestEditor, distance: minDistance };
}

/**
 * Drag & drop between blocks and between editors. Moved from the
 * former `SideMenuView` class into listeners bound to the extension's mount
 * signal. It changes two things: where
 * editors overlap, the editor under the drag event wins (see
 * `findDropEditor`), and the drag data is parsed in an inert document. `isDragOrigin` reports whether a side menu drag started in this
 * editor. A drop outside every editor but within `dropMargin` (px) of this
 * one goes into this editor.
 */
export function registerBlockDropHandlers(
  view: EditorView,
  isDragOrigin: () => boolean,
  dropMargin: number,
  signal: AbortSignal,
) {
  function isBlockNoteDrag(event: DragEvent) {
    return (
      view.dragging !== null ||
      isDragOrigin() ||
      event.dataTransfer?.types.includes("blocknote/html") ||
      (event.target instanceof Node && view.dom.contains(event.target))
    );
  }

  /**
   * Closes the drop-cursor for the current editor
   */
  function closeDropCursor() {
    const evt: SyntheticEvent = new Event("dragleave", { bubbles: false });
    // It needs to be synthetic, so we don't accidentally think it is a real dragend event
    evt.synthetic = true;
    // We dispatch the event to the current editor, so that the drop-cursor is removed for it
    view.dom.dispatchEvent(evt);
  }

  /**
   * Re-dispatches a drag event on this editor, with its coordinates clamped
   * into the editor's blocks. A plain `Event` with the drag event's fields
   * copied on, as a `DragEvent`'s coordinates can't be set.
   */
  function dispatchSyntheticEvent(event: DragEvent) {
    const dropPointBoundingBox = (
      view.dom.firstChild as HTMLElement
    ).getBoundingClientRect();
    const evt = Object.assign(new Event(event.type, event), {
      clientX: Math.min(
        Math.max(event.clientX, dropPointBoundingBox.left),
        dropPointBoundingBox.left + dropPointBoundingBox.width,
      ),
      clientY: Math.min(
        Math.max(event.clientY, dropPointBoundingBox.top),
        dropPointBoundingBox.top + dropPointBoundingBox.height,
      ),
      dataTransfer: event.dataTransfer,
      preventDefault: () => event.preventDefault(),
      synthetic: true, // prevent recursion
    });
    view.dom.dispatchEvent(evt);
  }

  /**
   * It is surprisingly difficult to determine the information we need to know about a drag event
   *
   * This function is trying to determine the following:
   *  - Whether the current editor instance is the drop point
   *  - Whether the current editor instance is the drag origin
   *  - Whether the drop event is within the bounds of the current editor instance
   */
  function getDragEventContext(event: DragEvent) {
    if (!isBlockNoteDrag(event)) {
      return undefined;
    }

    // We need to check if there is text content that is being dragged (select some text & just drag it)
    const textContentIsBeingDragged =
      !event.dataTransfer?.types.includes("blocknote/html") && !!view.dragging;
    // This is the side menu drag from this plugin
    const sideMenuIsBeingDragged = isDragOrigin();
    // Tells us that the current editor instance has a drag ongoing (either text or side menu)
    const isOrigin = textContentIsBeingDragged || sideMenuIsBeingDragged;

    // The editor the drag event is about, if any is within `dropMargin`
    const closestEditor = findDropEditor(view, event, dropMargin);
    if (!closestEditor) {
      return undefined;
    }

    // We check if the closest editor is the same as the current editor instance (which is the drop point)
    const isDropPoint = closestEditor.element === view.dom;
    // We check if the current editor instance is the same as the editor instance that the drag event is happening within
    const isDropWithinEditorBounds =
      isDropPoint && closestEditor.distance === 0;

    // We never want to handle drop events that are not related to us
    if (!isDropPoint && !isOrigin) {
      return undefined;
    }

    return {
      isDropPoint,
      isDropWithinEditorBounds,
      isDragOrigin: isOrigin,
    };
  }

  /**
   * If a block is being dragged, ProseMirror usually gets the context of what's
   * being dragged from `view.dragging`, which is automatically set when a
   * `dragstart` event fires in the editor. However, if the user tries to drag
   * and drop blocks between multiple editors, only the one in which the drag
   * began has that context, so we need to set it on the others manually. This
   * ensures that PM always drops the blocks in between other blocks, and not
   * inside them.
   *
   * After the `dragstart` event fires on the drag handle, it sets
   * `blocknote/html` data on the clipboard. This handler fires right after,
   * parsing the `blocknote/html` data into nodes and setting them on
   * `view.dragging`.
   *
   * Note: Setting `view.dragging` on `dragover` would be better as the user
   * could then drag between editors in different windows, but you can only
   * access `dataTransfer` contents on `dragstart` and `drop` events.
   */
  function onDragStart(event: DragEvent) {
    const html = event.dataTransfer?.getData("blocknote/html");
    if (!html) {
      return;
    }

    if (view.dragging) {
      // already dragging, so no-op
      return;
    }

    // Parsed in an inert document: unlike an element of the page, it does not
    // load resources or run event handlers in the HTML.
    const window = view.dom.ownerDocument.defaultView ?? globalThis.window;
    const element = new window.DOMParser().parseFromString(
      html,
      "text/html",
    ).body;

    // Into the type of the blocks' parent, when this editor has it (see
    // `dragStart`): a block that only this parent can hold, e.g. a column or
    // the step of a stepper, would otherwise be wrapped in a new copy of it.
    const { nodes } = view.state.schema;
    const parentType =
      nodes[event.dataTransfer!.getData("blocknote/parent")] ??
      nodes["blockGroup"];
    const parser = DOMParser.fromSchema(view.state.schema);
    const node = parser.parse(element, { topNode: parentType.create() });

    view.dragging = {
      slice: new Slice(node.content, 0, 0),
      move: true,
    };
  }

  /**
   * This dragover event handler listens at the document level,
   * and is trying to handle dragover events for all editors.
   *
   * It specifically is trying to handle the following cases:
   *  - If the dragover event is within the bounds of any editor, then it does nothing
   *  - If the dragover event is outside the bounds of any editor, but close enough (within `dropMargin`) to the closest editor,
   *    then it dispatches a synthetic dragover event to the closest editor (which will trigger the drop-cursor to be shown on that editor)
   *  - If the dragover event is outside the bounds of the current editor, then it will dispatch a synthetic dragleave event to the current editor
   *    (which will trigger the drop-cursor to be removed from the current editor)
   *
   * The synthetic event is a necessary evil because we do not control prosemirror-dropcursor to be able to show the drop-cursor within the range we want
   */
  function onDragOver(event: DragEvent) {
    if (isSynthetic(event)) {
      return;
    }

    // Relevance gate: Only handle drags that belong to BlockNote
    // This prevents interference with external drag-and-drop libraries
    // by avoiding calls to closeDropCursor() for non-BlockNote drags
    if (!isBlockNoteDrag(event)) {
      return;
    }

    const dragEventContext = getDragEventContext(event);

    if (!dragEventContext || !dragEventContext.isDropPoint) {
      // This is not a drag event that we are interested in
      // so, we close the drop-cursor
      closeDropCursor();
      return;
    }

    if (!dragEventContext.isDropWithinEditorBounds) {
      // we are the drop point, but the drag over event is not within the bounds of this editor instance
      // so, we need to dispatch an event that is in the bounds of this editor instance
      dispatchSyntheticEvent(event);
    }
  }

  /**
   * The drop event handler listens at the document level,
   * and handles drop events for all editors.
   *
   * It specifically handles the following cases:
   *  - If we are both the drag origin and drop point:
   *    - Let normal drop handling take over
   *  - If we are the drop point but not the drag origin:
   *    - Collapse selection to prevent PM from deleting unrelated content
   *    - If drop event is outside our editor bounds, dispatch synthetic drop event to our editor
   *  - If we are the drag origin but not the drop point:
   *    - Delete the dragged content from our editor after a delay
   */
  function onDrop(event: DragEvent) {
    if (isSynthetic(event)) {
      return;
    }

    if (!isBlockNoteDrag(event)) {
      return;
    }

    const context = getDragEventContext(event);
    if (!context) {
      closeDropCursor();
      // This is not a drag event that we are interested in
      return;
    }
    const { isDropPoint, isDropWithinEditorBounds, isDragOrigin } = context;

    if (!isDropWithinEditorBounds && isDropPoint) {
      // Any time that the drop event is outside of the editor bounds (but still close to an editor instance)
      // We dispatch a synthetic event that is in the bounds of the editor instance, to have the correct drop point
      dispatchSyntheticEvent(event);
    }

    if (isDropPoint) {
      // The current instance is the drop point

      if (view.dragging) {
        // Do not collapse selection when text content is being dragged
        return;
      }
      // Because the editor selection is unrelated to the dragged content, we
      // don't want PM to delete its content. Therefore, we collapse the
      // selection.
      view.dispatch(
        view.state.tr.setSelection(
          TextSelection.create(
            view.state.tr.doc,
            view.state.tr.selection.anchor,
          ),
        ),
      );
      return;
    } else if (isDragOrigin) {
      // The current instance is the drag origin, but not the drop point
      // our content got dropped somewhere else

      // Because the editor from which the block originates doesn't get a drop
      // event on it, PM doesn't delete its selected content. Therefore, we
      // need to do so manually.
      //
      // Note: Deleting the selected content from the editor from which the
      // block originates, may change its height. This can cause the position of
      // the editor in which the block is being dropping to shift, before it
      // can handle the drop event. That in turn can cause the drop to happen
      // somewhere other than the user intended. To get around this, we delay
      // deleting the selected content until all editors have had the chance to
      // handle the event.
      setTimeout(() => view.dispatch(view.state.tr.deleteSelection()), 0);
      return;
    }
  }

  function onDragEnd(event: DragEvent) {
    if (isSynthetic(event)) {
      return;
    }
    // When the user starts dragging a block, `view.dragging` is set on all
    // BlockNote editors. However, when the drag ends, only the editor that the
    // drag originated in automatically clears `view.dragging`. Therefore, we
    // have to manually clear it on all editors.
    view.dragging = null;
  }

  // The DOM lib types `root` as `Document | ShadowRoot`, whose listener maps
  // don't share the drag event types, so the handlers are typed by hand.
  const root = view.root as Document;
  root.addEventListener("dragstart", onDragStart, { signal });
  root.addEventListener("dragover", onDragOver, { signal });
  root.addEventListener("drop", onDrop, { signal, capture: true });
  root.addEventListener("dragend", onDragEnd, { signal, capture: true });
}
