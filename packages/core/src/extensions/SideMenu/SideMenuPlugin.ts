import { PluginView } from "@tiptap/pm/state";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import { Block } from "../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { UiElementPosition } from "../../extensions-shared/UiElementPosition.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import { EventEmitter } from "../../util/EventEmitter.js";
import { initializeESMDependencies } from "../../util/esmDependencies.js";
import { getDraggableBlockFromElement } from "../getDraggableBlockFromElement.js";
import { dragStart, unsetDragImage } from "./dragging.js";
import { DOMParser } from "prosemirror-model";
import { Slice } from "@tiptap/pm/model";

export type SideMenuState<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = UiElementPosition & {
  // The block that the side menu is attached to.
  block: Block<BSchema, I, S>;
};

function getBlockFromCoords(
  view: EditorView,
  coords: { left: number; top: number },
  adjustForColumns = true
) {
  // bit hacky - offset x position to right to account for the width of sidemenu itself
  const elements = view.root.elementsFromPoint(coords.left + 50, coords.top);

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
            left: coords.left,
            top: coords.top,
          },
          false
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
  view: EditorView
): { node: HTMLElement; id: string } | undefined {
  const coords = {
    left: mousePos.x,
    top: mousePos.y,
  };

  return getBlockFromCoords(view, coords);
}

/**
 * With the sidemenu plugin we can position a menu next to a hovered block.
 */
export class SideMenuView<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> implements PluginView
{
  public state?: SideMenuState<BSchema, I, S>;
  public readonly emitUpdate: (state: SideMenuState<BSchema, I, S>) => void;

  private mousePos: { x: number; y: number } | undefined;

  private hoveredBlock: HTMLElement | undefined;

  public menuFrozen = false;

  constructor(
    private readonly editor: BlockNoteEditor<BSchema, I, S>,
    private readonly pmView: EditorView,
    emitUpdate: (state: SideMenuState<BSchema, I, S>) => void
  ) {
    this.emitUpdate = () => {
      if (!this.state) {
        throw new Error("Attempting to update uninitialized side menu");
      }

      emitUpdate(this.state);
    };

    this.pmView.root.addEventListener(
      "drop",
      this.onDrop as EventListener,
      true
    );
    initializeESMDependencies();

    // Shows or updates menu position whenever the cursor moves, if the menu isn't frozen.
    this.pmView.root.addEventListener(
      "mousemove",
      this.onMouseMove as EventListener,
      true
    );

    // Hides and unfreezes the menu whenever the user presses a key.
    this.pmView.root.addEventListener(
      "keydown",
      this.onKeyDown as EventListener,
      true
    );

    this.pmView.root.addEventListener(
      "dragstart",
      this.dragStart as EventListener
    );
  }

  dragStart = (event: DragEvent) => {
    const html = event.dataTransfer?.getData("blocknote/html");

    if (!html) {
      return;
    }

    const element = document.createElement("div");
    element.innerHTML = html;

    const parser = DOMParser.fromSchema(this.pmView.state.schema);
    const node = parser.parse(element, {
      topNode: this.pmView.state.schema.nodes["blockGroup"].create(),
    });
    console.log(html);
    console.log(node);

    this.pmView.dragging = {
      slice: new Slice(node.content, 0, 0),
      move: true,
    };
  };

  updateState = (state: SideMenuState<BSchema, I, S>) => {
    this.state = state;
    this.emitUpdate(this.state);
  };

  updateStateFromMousePos = () => {
    if (this.menuFrozen || !this.mousePos) {
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

    // Gets the block's content node, which lets to ignore child blocks when determining the block menu's position.
    // TODO: needed?
    const blockContent = block.node.firstChild as HTMLElement;

    if (!blockContent) {
      return;
    }

    // TODO: needed?

    // Shows or updates elements.
    if (this.editor.isEditable) {
      const blockContentBoundingBox = blockContent.getBoundingClientRect();
      const column = block.node.closest("[data-node-type=column]");
      this.updateState({
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
          blockContentBoundingBox.height
        ),
        block: this.editor.getBlock(
          this.hoveredBlock!.getAttribute("data-id")!
        )!,
      });
    }
  };

  onDrop = (event: DragEvent) => {
    if (
      this.pmView.dragging &&
      this.pmView.dom.contains(event.target as Node)
    ) {
      return;
    }

    this.pmView.dispatch(this.pmView.state.tr.deleteSelection());

    return;
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
      true
    );

    this.pmView.root.removeEventListener(
      "drop",
      this.onDrop as EventListener,
      true
    );
    this.pmView.root.removeEventListener(
      "keydown",
      this.onKeyDown as EventListener,
      true
    );
  }
}

export const sideMenuPluginKey = new PluginKey("SideMenuPlugin");

export class SideMenuProsemirrorPlugin<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> extends EventEmitter<any> {
  public view: SideMenuView<BSchema, I, S> | undefined;
  public readonly plugin: Plugin;

  constructor(private readonly editor: BlockNoteEditor<BSchema, I, S>) {
    super();
    this.plugin = new Plugin({
      key: sideMenuPluginKey,
      view: (editorView) => {
        this.view = new SideMenuView(editor, editorView, (state) => {
          this.emit("update", state);
        });
        return this.view;
      },
    });
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
    block: Block<BSchema, I, S>
  ) => {
    dragStart(event, block, this.editor);
  };

  /**
   * Handles drag & drop events for blocks.
   */
  blockDragEnd = () => {
    if (this.editor.prosemirrorView) {
      unsetDragImage(this.editor.prosemirrorView.root);
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
