import { PluginView } from "@tiptap/pm/state";
import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import { getBlockInfoFromPos } from "../../api/getBlockInfoFromPos";
import { Block } from "../../blocks/defaultBlocks";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { UiElementPosition } from "../../extensions-shared/UiElementPosition";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema";
import { EventEmitter } from "../../util/EventEmitter";
import { initializeESMDependencies } from "../../util/esmDependencies";
import { dragStart, unsetDragImage } from "./dragging";

export type SideMenuState<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = UiElementPosition & {
  // The block that the side menu is attached to.
  block: Block<BSchema, I, S>;
};

const getBlockFromMousePos = (
  mousePos: {
    x: number;
    y: number;
  },
  view: EditorView
): { node: HTMLElement; id: string } | undefined => {
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

  // this.horizontalPosAnchor = editorBoundingBox.x;

  // Gets block at mouse cursor's vertical position.
  const coords = {
    left: editorBoundingBox.left + editorBoundingBox.width / 2, // take middle of editor
    top: mousePos.y,
  };

  const elements = view.root.elementsFromPoint(coords.left, coords.top);
  let block = undefined;

  for (const element of elements) {
    if (view.dom.contains(element)) {
      block = getDraggableBlockFromElement(element, view);
      break;
    }
  }

  return block;
};

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

  // Used to check if currently dragged content comes from this editor instance.
  public isDragging = false; // TODO

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
    this.pmView.root.addEventListener(
      "dragover",
      this.onDragOver as EventListener
    );
    initializeESMDependencies();
    this.pmView.dom.addEventListener("dragstart", this.onDragStart);

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
  }

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
    const blockContent = block.node.firstChild as HTMLElement;

    if (!blockContent) {
      return;
    }

    // TODO: needed?

    // Shows or updates elements.
    if (this.editor.isEditable) {
      const editorBoundingBox = (
        this.pmView.dom.firstChild as HTMLElement
      ).getBoundingClientRect();
      const blockContentBoundingBox = blockContent.getBoundingClientRect();

      this.updateState({
        show: true,
        referencePos: new DOMRect(
          editorBoundingBox.x,
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

  /**
   * Sets isDragging when dragging text.
   *
   * TODO: clean up naming confusing
   */
  onDragStart = () => {
    this.isDragging = true;
  };

  /**
   * If the event is outside the editor contents,
   * we dispatch a fake event, so that we can still drop the content
   * when dragging / dropping to the side of the editor
   */
  onDrop = (event: DragEvent) => {
    this.editor._tiptapEditor.commands.blur();

    if ((event as any).synthetic || !this.isDragging) {
      return;
    }

    const pos = this.pmView.posAtCoords({
      left: event.clientX,
      top: event.clientY,
    });

    this.isDragging = false;

    if (!pos || pos.inside === -1) {
      const evt = new Event("drop", event) as any;
      const editorBoundingBox = (
        this.pmView.dom.firstChild as HTMLElement
      ).getBoundingClientRect();
      evt.clientX =
        event.clientX < editorBoundingBox.left ||
        event.clientX > editorBoundingBox.left + editorBoundingBox.width
          ? editorBoundingBox.left + editorBoundingBox.width / 2
          : event.clientX;
      evt.clientY = Math.min(
        Math.max(event.clientY, editorBoundingBox.top),
        editorBoundingBox.top + editorBoundingBox.height
      );
      evt.dataTransfer = event.dataTransfer;
      evt.preventDefault = () => event.preventDefault();
      evt.synthetic = true; // prevent recursion
      // console.log("dispatch fake drop");
      this.pmView.dom.dispatchEvent(evt);
    }
  };

  /**
   * If the event is outside the editor contents,
   * we dispatch a fake event, so that we can still drop the content
   * when dragging / dropping to the side of the editor
   */
  onDragOver = (event: DragEvent) => {
    if ((event as any).synthetic || !this.isDragging) {
      return;
    }
    const pos = this.pmView.posAtCoords({
      left: event.clientX,
      top: event.clientY,
    });

    if (!pos || (pos.inside === -1 && this.pmView.dom.firstChild)) {
      const evt = new Event("dragover", event) as any;
      const editorBoundingBox = (
        this.pmView.dom.firstChild as HTMLElement
      ).getBoundingClientRect();
      evt.clientX = editorBoundingBox.left + editorBoundingBox.width / 2;
      evt.clientY = event.clientY;
      evt.dataTransfer = event.dataTransfer;
      evt.preventDefault = () => event.preventDefault();
      evt.synthetic = true; // prevent recursion
      // console.log("dispatch fake dragover");
      this.pmView.dom.dispatchEvent(evt);
    }
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
    const docChanged = !prevState.doc.eq(this.pmView.state.doc)
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
      "dragover",
      this.onDragOver as EventListener
    );
    this.pmView.dom.removeEventListener("dragstart", this.onDragStart);
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

  addBlock() {
    if (this.state?.show) {
      this.state.show = false;
      this.emitUpdate(this.state);
    }

    if (!this.hoveredBlock?.firstChild) {
      return;
    }

    const blockContent = this.hoveredBlock.firstChild as HTMLElement;
    const blockContentBoundingBox = blockContent.getBoundingClientRect();

    const pos = this.pmView.posAtCoords({
      left: blockContentBoundingBox.left + blockContentBoundingBox.width / 2,
      top: blockContentBoundingBox.top + blockContentBoundingBox.height / 2,
    });
    if (!pos) {
      return;
    }

    const blockInfo = getBlockInfoFromPos(
      this.editor._tiptapEditor.state.doc,
      pos.pos
    );
    if (blockInfo === undefined) {
      return;
    }

    const { contentNode, startPos, endPos } = blockInfo;

    // Creates a new block if current one is not empty for the suggestion menu to open in.
    if (
      contentNode.type.spec.content !== "inline*" ||
      contentNode.textContent.length !== 0
    ) {
      const newBlockInsertionPos = endPos + 1;
      const newBlockContentPos = newBlockInsertionPos + 2;

      this.editor._tiptapEditor
        .chain()
        .BNCreateBlock(newBlockInsertionPos)
        // .BNUpdateBlock(newBlockContentPos, { type: "paragraph", props: {} })
        .setTextSelection(newBlockContentPos)
        .run();
    } else {
      this.editor._tiptapEditor.commands.setTextSelection(startPos + 1);
    }

    // Focuses and activates the slash menu.
    this.editor.openSuggestionMenu("/");
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
   * If the block is empty, opens the slash menu. If the block has content,
   * creates a new block below and opens the slash menu in it.
   */
  addBlock = () => this.view!.addBlock();

  /**
   * Handles drag & drop events for blocks.
   */
  blockDragStart = (event: {
    dataTransfer: DataTransfer | null;
    clientY: number;
  }) => {
    this.view!.isDragging = true;
    dragStart(event, this.editor);
  };

  /**
   * Handles drag & drop events for blocks.
   */
  blockDragEnd = () => unsetDragImage(this.editor.prosemirrorView.root);
  /**
   * Freezes the side menu. When frozen, the side menu will stay
   * attached to the same block regardless of which block is hovered by the
   * mouse cursor.
   */
  freezeMenu = () => (this.view!.menuFrozen = true);
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

export function getDraggableBlockFromElement(
  element: Element,
  view: EditorView
) {
  while (
    element &&
    element.parentElement &&
    element.parentElement !== view.dom &&
    element.getAttribute?.("data-node-type") !== "blockContainer"
  ) {
    element = element.parentElement;
  }
  if (element.getAttribute?.("data-node-type") !== "blockContainer") {
    return undefined;
  }
  return { node: element as HTMLElement, id: element.getAttribute("data-id")! };
}
