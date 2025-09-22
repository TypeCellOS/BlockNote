import { DOMParser, Slice } from "@tiptap/pm/model";
import {
  EditorState,
  Plugin,
  PluginKey,
  PluginView,
  TextSelection,
} from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";

import { Block } from "../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { BlockNoteExtension } from "../../editor/BlockNoteExtension.js";
import { UiElementPosition } from "../../extensions-shared/UiElementPosition.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import { getDraggableBlockFromElement } from "../getDraggableBlockFromElement.js";
import { dragStart, unsetDragImage } from "./dragging.js";

export type SideMenuState<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> = UiElementPosition & {
  // The block that the side menu is attached to.
  block: Block<BSchema, I, S>;
};

const DISTANCE_TO_CONSIDER_EDITOR_BOUNDS = 250;

function getBlockFromCoords(
  view: EditorView,
  coords: { left: number; top: number },
  adjustForColumns = true,
) {
  const elements = view.root.elementsFromPoint(coords.left, coords.top);

  for (const element of elements) {
    if (!view.dom.contains(element)) {
      // probably a ui overlay like formatting toolbar etc
      continue;
    }
    if (adjustForColumns) {
      const column = element.closest("[data-node-type=columnList]");
      if (column) {
        return getBlockFromCoords(
          view,
          {
            // TODO can we do better than this?
            left: coords.left + 50, // bit hacky, but if we're inside a column, offset x position to right to account for the width of sidemenu itself
            top: coords.top,
          },
          false,
        );
      }
    }
    return getDraggableBlockFromElement(element, view);
  }
  return undefined;
}

function getBlockFromMousePos(
  mousePos: {
    x: number;
    y: number;
  },
  view: EditorView,
): { node: HTMLElement; id: string } | undefined {
  // Editor itself may have padding or other styling which affects
  // size/position, so we get the boundingRect of the first child (i.e. the
  // blockGroup that wraps all blocks in the editor) for more accurate side
  // menu placement.
  if (!view.dom.firstChild) {
    return;
  }

  const editorBoundingBox = (
    view.dom.firstChild as HTMLElement
  ).getBoundingClientRect();

  // Gets block at mouse cursor's position.
  const coords = {
    // Clamps the x position to the editor's bounding box.
    left: Math.min(
      Math.max(editorBoundingBox.left + 10, mousePos.x),
      editorBoundingBox.right - 10,
    ),
    top: mousePos.y,
  };

  const referenceBlock = getBlockFromCoords(view, coords);

  if (!referenceBlock) {
    // could not find the reference block
    return undefined;
  }

  /**
   * Because blocks may be nested, we need to check the right edge of the parent block:
   * ```
   * | BlockA        |
   * x | BlockB     y|
   * ```
   * Hovering at position x (left edge of BlockB) would return BlockA.
   * Instead, we check at position y (right edge of BlockA) to correctly identify BlockB.
   */
  const referenceBlocksBoundingBox =
    referenceBlock.node.getBoundingClientRect();
  return getBlockFromCoords(
    view,
    {
      left: referenceBlocksBoundingBox.right - 10,
      top: mousePos.y,
    },
    false,
  );
}

/**
 * With the sidemenu plugin we can position a menu next to a hovered block.
 */
export class SideMenuView<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> implements PluginView
{
  public state?: SideMenuState<BSchema, I, S>;
  public readonly emitUpdate: (state: SideMenuState<BSchema, I, S>) => void;

  private mousePos: { x: number; y: number } | undefined;

  private hoveredBlock: HTMLElement | undefined;

  public menuFrozen = false;

  public isDragOrigin = false;

  constructor(
    private readonly editor: BlockNoteEditor<BSchema, I, S>,
    private readonly pmView: EditorView,
    emitUpdate: (state: SideMenuState<BSchema, I, S>) => void,
  ) {
    this.emitUpdate = () => {
      if (!this.state) {
        throw new Error("Attempting to update uninitialized side menu");
      }

      emitUpdate(this.state);
    };

    this.pmView.root.addEventListener(
      "dragstart",
      this.onDragStart as EventListener,
    );
    this.pmView.root.addEventListener(
      "dragover",
      this.onDragOver as EventListener,
    );
    this.pmView.root.addEventListener(
      "drop",
      this.onDrop as EventListener,
      true,
    );
    this.pmView.root.addEventListener(
      "dragend",
      this.onDragEnd as EventListener,
      true,
    );

    // Shows or updates menu position whenever the cursor moves, if the menu isn't frozen.
    this.pmView.root.addEventListener(
      "mousemove",
      this.onMouseMove as EventListener,
      true,
    );

    // Hides and unfreezes the menu whenever the user presses a key.
    this.pmView.root.addEventListener(
      "keydown",
      this.onKeyDown as EventListener,
      true,
    );

    // Setting capture=true ensures that any parent container of the editor that
    // gets scrolled will trigger the scroll event. Scroll events do not bubble
    // and so won't propagate to the document by default.
    pmView.root.addEventListener("scroll", this.onScroll, true);
  }

  updateState = (state: SideMenuState<BSchema, I, S>) => {
    this.state = state;
    this.emitUpdate(this.state);
  };

  updateStateFromMousePos = () => {
    if (this.menuFrozen || !this.mousePos) {
      return;
    }

    const closestEditor = this.findClosestEditorElement({
      clientX: this.mousePos.x,
      clientY: this.mousePos.y,
    });

    if (
      closestEditor?.element !== this.pmView.dom ||
      closestEditor.distance > DISTANCE_TO_CONSIDER_EDITOR_BOUNDS
    ) {
      if (this.state?.show) {
        this.state.show = false;
        this.updateState(this.state);
      }
      return;
    }

    const block = getBlockFromMousePos(this.mousePos, this.pmView);

    // Closes the menu if the mouse cursor is beyond the editor vertically.
    if (!block || !this.editor.isEditable) {
      if (this.state?.show) {
        this.state.show = false;
        this.updateState(this.state);
      }

      return;
    }

    // Doesn't update if the menu is already open and the mouse cursor is still hovering the same block.
    if (
      this.state?.show &&
      this.hoveredBlock?.hasAttribute("data-id") &&
      this.hoveredBlock?.getAttribute("data-id") === block.id
    ) {
      return;
    }

    this.hoveredBlock = block.node;

    // Shows or updates elements.
    if (this.editor.isEditable) {
      const blockContentBoundingBox = block.node.getBoundingClientRect();
      const column = block.node.closest("[data-node-type=column]");
      this.state = {
        show: true,
        referencePos: new DOMRect(
          column
            ? // We take the first child as column elements have some default
              // padding. This is a little weird since this child element will
              // be the first block, but since it's always non-nested and we
              // only take the x coordinate, it's ok.
              column.firstElementChild!.getBoundingClientRect().x
            : (
                this.pmView.dom.firstChild as HTMLElement
              ).getBoundingClientRect().x,
          blockContentBoundingBox.y,
          blockContentBoundingBox.width,
          blockContentBoundingBox.height,
        ),
        block: this.editor.getBlock(
          this.hoveredBlock!.getAttribute("data-id")!,
        )!,
      };
      this.updateState(this.state);
    }
  };

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
  onDragStart = (event: DragEvent) => {
    const html = event.dataTransfer?.getData("blocknote/html");
    if (!html) {
      return;
    }

    if (this.pmView.dragging) {
      // already dragging, so no-op
      return;
    }

    const element = document.createElement("div");
    element.innerHTML = html;

    const parser = DOMParser.fromSchema(this.pmView.state.schema);
    const node = parser.parse(element, {
      topNode: this.pmView.state.schema.nodes["blockGroup"].create(),
    });

    this.pmView.dragging = {
      slice: new Slice(node.content, 0, 0),
      move: true,
    };
  };

  /**
   * Finds the closest editor visually to the given coordinates
   */
  private findClosestEditorElement = (coords: {
    clientX: number;
    clientY: number;
  }) => {
    // Get all editor elements in the document
    const editors = Array.from(this.pmView.root.querySelectorAll(".bn-editor"));

    if (editors.length === 0) {
      return null;
    }

    // Find the editor with the smallest distance to the coordinates
    let closestEditor = editors[0];
    let minDistance = Number.MAX_VALUE;

    editors.forEach((editor) => {
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

      const distance = Math.sqrt(
        Math.pow(distanceX, 2) + Math.pow(distanceY, 2),
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestEditor = editor;
      }
    });

    return {
      element: closestEditor,
      distance: minDistance,
    };
  };

  /**
   * This dragover event handler listens at the document level,
   * and is trying to handle dragover events for all editors.
   *
   * It specifically is trying to handle the following cases:
   *  - If the dragover event is within the bounds of any editor, then it does nothing
   *  - If the dragover event is outside the bounds of any editor, but close enough (within DISTANCE_TO_CONSIDER_EDITOR_BOUNDS) to the closest editor,
   *    then it dispatches a synthetic dragover event to the closest editor (which will trigger the drop-cursor to be shown on that editor)
   *  - If the dragover event is outside the bounds of the current editor, then it will dispatch a synthetic dragleave event to the current editor
   *    (which will trigger the drop-cursor to be removed from the current editor)
   *
   * The synthetic event is a necessary evil because we do not control prosemirror-dropcursor to be able to show the drop-cursor within the range we want
   */
  onDragOver = (event: DragEvent) => {
    if ((event as any).synthetic) {
      return;
    }

    const dragEventContext = this.getDragEventContext(event);

    if (!dragEventContext || !dragEventContext.isDropPoint) {
      // This is not a drag event that we are interested in
      // so, we close the drop-cursor
      this.closeDropCursor();
      return;
    }

    if (
      dragEventContext.isDropPoint &&
      !dragEventContext.isDropWithinEditorBounds
    ) {
      // we are the drop point, but the drag over event is not within the bounds of this editor instance
      // so, we need to dispatch an event that is in the bounds of this editor instance
      this.dispatchSyntheticEvent(event);
    }
  };

  /**
   * Closes the drop-cursor for the current editor
   */
  private closeDropCursor = () => {
    const evt = new Event("dragleave", { bubbles: false });
    // It needs to be synthetic, so we don't accidentally think it is a real dragend event
    (evt as any).synthetic = true;
    // We dispatch the event to the current editor, so that the drop-cursor is removed for it
    this.pmView.dom.dispatchEvent(evt);
  };

  /**
   * It is surprisingly difficult to determine the information we need to know about a drag event
   *
   * This function is trying to determine the following:
   *  - Whether the current editor instance is the drop point
   *  - Whether the current editor instance is the drag origin
   *  - Whether the drop event is within the bounds of the current editor instance
   */
  getDragEventContext = (event: DragEvent) => {
    // We need to check if there is text content that is being dragged (select some text & just drag it)
    const textContentIsBeingDragged =
      !event.dataTransfer?.types.includes("blocknote/html") &&
      !!this.pmView.dragging;
    // This is the side menu drag from this plugin
    const sideMenuIsBeingDragged = !!this.isDragOrigin;
    // Tells us that the current editor instance has a drag ongoing (either text or side menu)
    const isDragOrigin = textContentIsBeingDragged || sideMenuIsBeingDragged;

    // Tells us which editor instance is the closest to the drag event (whether or not it is actually reasonably close)
    const closestEditor = this.findClosestEditorElement(event);

    // We arbitrarily decide how far is "too far" from the closest editor to be considered a drop point
    if (
      !closestEditor ||
      closestEditor.distance > DISTANCE_TO_CONSIDER_EDITOR_BOUNDS
    ) {
      // we are too far from the closest editor, or no editor was found
      return undefined;
    }

    // We check if the closest editor is the same as the current editor instance (which is the drop point)
    const isDropPoint = closestEditor.element === this.pmView.dom;
    // We check if the current editor instance is the same as the editor instance that the drag event is happening within
    const isDropWithinEditorBounds =
      isDropPoint && closestEditor.distance === 0;

    // We never want to handle drop events that are not related to us
    if (!isDropPoint && !isDragOrigin) {
      // we are not the drop point or drag origin, so not relevant to us
      return undefined;
    }

    return {
      isDropPoint,
      isDropWithinEditorBounds,
      isDragOrigin,
    };
  };

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
  onDrop = (event: DragEvent) => {
    if ((event as any).synthetic) {
      return;
    }

    const context = this.getDragEventContext(event);
    if (!context) {
      this.closeDropCursor();
      // This is not a drag event that we are interested in
      return;
    }
    const { isDropPoint, isDropWithinEditorBounds, isDragOrigin } = context;

    if (!isDropWithinEditorBounds && isDropPoint) {
      // Any time that the drop event is outside of the editor bounds (but still close to an editor instance)
      // We dispatch a synthetic event that is in the bounds of the editor instance, to have the correct drop point
      this.dispatchSyntheticEvent(event);
    }

    if (isDropPoint) {
      // The current instance is the drop point

      if (this.pmView.dragging) {
        // Do not collapse selection when text content is being dragged
        return;
      }
      // Because the editor selection is unrelated to the dragged content, we
      // don't want PM to delete its content. Therefore, we collapse the
      // selection.
      this.pmView.dispatch(
        this.pmView.state.tr.setSelection(
          TextSelection.create(
            this.pmView.state.tr.doc,
            this.pmView.state.tr.selection.anchor,
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
      setTimeout(
        () => this.pmView.dispatch(this.pmView.state.tr.deleteSelection()),
        0,
      );
      return;
    }
  };

  onDragEnd = (event: DragEvent) => {
    if ((event as any).synthetic) {
      return;
    }
    // When the user starts dragging a block, `view.dragging` is set on all
    // BlockNote editors. However, when the drag ends, only the editor that the
    // drag originated in automatically clears `view.dragging`. Therefore, we
    // have to manually clear it on all editors.
    this.pmView.dragging = null;
  };

  onKeyDown = (_event: KeyboardEvent) => {
    if (this.state?.show && this.editor.isFocused()) {
      // Typing in editor should hide side menu
      this.state.show = false;
      this.emitUpdate(this.state);
    }
  };

  onMouseMove = (event: MouseEvent) => {
    if (this.menuFrozen) {
      return;
    }

    this.mousePos = { x: event.clientX, y: event.clientY };

    // We want the full area of the editor to check if the cursor is hovering
    // above it though.
    const editorOuterBoundingBox = this.pmView.dom.getBoundingClientRect();
    const cursorWithinEditor =
      this.mousePos.x > editorOuterBoundingBox.left &&
      this.mousePos.x < editorOuterBoundingBox.right &&
      this.mousePos.y > editorOuterBoundingBox.top &&
      this.mousePos.y < editorOuterBoundingBox.bottom;

    // TODO: remove parentElement, but then we need to remove padding from boundingbox or find a different solution
    const editorWrapper = this.pmView.dom!.parentElement!;

    // Doesn't update if the mouse hovers an element that's over the editor but
    // isn't a part of it or the side menu.
    if (
      // Cursor is within the editor area
      cursorWithinEditor &&
      // An element is hovered
      event &&
      event.target &&
      // Element is outside the editor
      !(
        editorWrapper === event.target ||
        editorWrapper.contains(event.target as HTMLElement)
      )
    ) {
      if (this.state?.show) {
        this.state.show = false;
        this.emitUpdate(this.state);
      }

      return;
    }

    this.updateStateFromMousePos();
  };

  private dispatchSyntheticEvent(event: DragEvent) {
    const evt = new Event(event.type as "dragover", event) as any;
    const dropPointBoundingBox = (
      this.pmView.dom.firstChild as HTMLElement
    ).getBoundingClientRect();
    evt.clientX = event.clientX;
    evt.clientY = event.clientY;

    evt.clientX = Math.min(
      Math.max(event.clientX, dropPointBoundingBox.left),
      dropPointBoundingBox.left + dropPointBoundingBox.width,
    );
    evt.clientY = Math.min(
      Math.max(event.clientY, dropPointBoundingBox.top),
      dropPointBoundingBox.top + dropPointBoundingBox.height,
    );

    evt.dataTransfer = event.dataTransfer;
    evt.preventDefault = () => event.preventDefault();
    evt.synthetic = true; // prevent recursion
    this.pmView.dom.dispatchEvent(evt);
  }

  onScroll = () => {
    if (this.state?.show) {
      this.state.referencePos = this.hoveredBlock!.getBoundingClientRect();
      this.emitUpdate(this.state);
    }
    this.updateStateFromMousePos();
  };

  // Needed in cases where the editor state updates without the mouse cursor
  // moving, as some state updates can require a side menu update. For example,
  // adding a button to the side menu which removes the block can cause the
  // block below to jump up into the place of the removed block when clicked,
  // allowing the user to click the button again without moving the cursor. This
  // would otherwise not update the side menu, and so clicking the button again
  // would attempt to remove the same block again, causing an error.
  update(_view: EditorView, prevState: EditorState) {
    const docChanged = !prevState.doc.eq(this.pmView.state.doc);
    if (docChanged && this.state?.show) {
      this.updateStateFromMousePos();
    }
  }

  destroy() {
    if (this.state?.show) {
      this.state.show = false;
      this.emitUpdate(this.state);
    }
    this.pmView.root.removeEventListener(
      "mousemove",
      this.onMouseMove as EventListener,
      true,
    );
    this.pmView.root.removeEventListener(
      "dragstart",
      this.onDragStart as EventListener,
    );
    this.pmView.root.removeEventListener(
      "dragover",
      this.onDragOver as EventListener,
    );
    this.pmView.root.removeEventListener(
      "drop",
      this.onDrop as EventListener,
      true,
    );
    this.pmView.root.removeEventListener(
      "dragend",
      this.onDragEnd as EventListener,
      true,
    );
    this.pmView.root.removeEventListener(
      "keydown",
      this.onKeyDown as EventListener,
      true,
    );
    this.pmView.root.removeEventListener("scroll", this.onScroll, true);
  }
}

export const sideMenuPluginKey = new PluginKey("SideMenuPlugin");

export class SideMenuProsemirrorPlugin<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> extends BlockNoteExtension {
  public static key() {
    return "sideMenu";
  }

  public view: SideMenuView<BSchema, I, S> | undefined;

  constructor(private readonly editor: BlockNoteEditor<BSchema, I, S>) {
    super();
    this.addProsemirrorPlugin(
      new Plugin({
        key: sideMenuPluginKey,
        view: (editorView) => {
          this.view = new SideMenuView(editor, editorView, (state) => {
            this.emit("update", state);
          });
          return this.view;
        },
      }),
    );
  }

  public onUpdate(callback: (state: SideMenuState<BSchema, I, S>) => void) {
    return this.on("update", callback);
  }

  /**
   * Handles drag & drop events for blocks.
   */
  blockDragStart = (
    event: {
      dataTransfer: DataTransfer | null;
      clientY: number;
    },
    block: Block<BSchema, I, S>,
  ) => {
    if (this.view) {
      this.view.isDragOrigin = true;
    }

    dragStart(event, block, this.editor);
  };

  /**
   * Handles drag & drop events for blocks.
   */
  blockDragEnd = () => {
    unsetDragImage(this.editor.prosemirrorView.root);

    if (this.view) {
      this.view.isDragOrigin = false;
    }
  };
  /**
   * Freezes the side menu. When frozen, the side menu will stay
   * attached to the same block regardless of which block is hovered by the
   * mouse cursor.
   */
  freezeMenu = () => {
    this.view!.menuFrozen = true;
    this.view!.state!.show = true;
    this.view!.emitUpdate(this.view!.state!);
  };
  /**
   * Unfreezes the side menu. When frozen, the side menu will stay
   * attached to the same block regardless of which block is hovered by the
   * mouse cursor.
   */
  unfreezeMenu = () => {
    this.view!.menuFrozen = false;
    this.view!.state!.show = false;
    this.view!.emitUpdate(this.view!.state!);
  };
}
