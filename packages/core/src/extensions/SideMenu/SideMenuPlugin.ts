import { PluginView } from "@tiptap/pm/state";
import { Node } from "prosemirror-model";
import { NodeSelection, Plugin, PluginKey, Selection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import { createExternalHTMLExporter } from "../../api/exporters/html/externalHTMLExporter";
import { createInternalHTMLSerializer } from "../../api/exporters/html/internalHTMLSerializer";
import { cleanHTMLToMarkdown } from "../../api/exporters/markdown/markdownExporter";
import { getBlockInfoFromPos } from "../../api/getBlockInfoFromPos";
import { Block } from "../../blocks/defaultBlocks";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { UiElementPosition } from "../../extensions-shared/UiElementPosition";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../schema";
import { EventEmitter } from "../../util/EventEmitter";
import { initializeESMDependencies } from "../../util/esmDependencies";
import { MultipleNodeSelection } from "./MultipleNodeSelection";

let dragImageElement: Element | undefined;

export type SideMenuState<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = UiElementPosition & {
  // The block that the side menu is attached to.
  block: Block<BSchema, I, S>;
};

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

function blockPositionFromElement(element: Element, view: EditorView) {
  const block = getDraggableBlockFromElement(element, view);

  if (block && block.node.nodeType === 1) {
    // TODO: this uses undocumented PM APIs? do we need this / let's add docs?
    const docView = (view as any).docView;
    const desc = docView.nearestDesc(block.node, true);
    if (!desc || desc === docView) {
      return null;
    }
    return desc.posBefore;
  }
  return null;
}

function blockPositionsFromSelection(selection: Selection, doc: Node) {
  // Absolute positions just before the first block spanned by the selection, and just after the last block. Having the
  // selection start and end just before and just after the target blocks ensures no whitespace/line breaks are left
  // behind after dragging & dropping them.
  let beforeFirstBlockPos: number;
  let afterLastBlockPos: number;

  // Even the user starts dragging blocks but drops them in the same place, the selection will still be moved just
  // before & just after the blocks spanned by the selection, and therefore doesn't need to change if they try to drag
  // the same blocks again. If this happens, the anchor & head move out of the block content node they were originally
  // in. If the anchor should update but the head shouldn't and vice versa, it means the user selection is outside a
  // block content node, which should never happen.
  const selectionStartInBlockContent =
    doc.resolve(selection.from).node().type.spec.group === "blockContent";
  const selectionEndInBlockContent =
    doc.resolve(selection.to).node().type.spec.group === "blockContent";

  // Ensures that entire outermost nodes are selected if the selection spans multiple nesting levels.
  const minDepth = Math.min(selection.$anchor.depth, selection.$head.depth);

  if (selectionStartInBlockContent && selectionEndInBlockContent) {
    // Absolute positions at the start of the first block in the selection and at the end of the last block. User
    // selections will always start and end in block content nodes, but we want the start and end positions of their
    // parent block nodes, which is why minDepth - 1 is used.
    const startFirstBlockPos = selection.$from.start(minDepth - 1);
    const endLastBlockPos = selection.$to.end(minDepth - 1);

    // Shifting start and end positions by one moves them just outside the first and last selected blocks.
    beforeFirstBlockPos = doc.resolve(startFirstBlockPos - 1).pos;
    afterLastBlockPos = doc.resolve(endLastBlockPos + 1).pos;
  } else {
    beforeFirstBlockPos = selection.from;
    afterLastBlockPos = selection.to;
  }

  return { from: beforeFirstBlockPos, to: afterLastBlockPos };
}

function setDragImage(view: EditorView, from: number, to = from) {
  if (from === to) {
    // Moves to position to be just after the first (and only) selected block.
    to += view.state.doc.resolve(from + 1).node().nodeSize;
  }

  // Parent element is cloned to remove all unselected children without affecting the editor content.
  const parentClone = view.domAtPos(from).node.cloneNode(true) as Element;
  const parent = view.domAtPos(from).node as Element;

  const getElementIndex = (parentElement: Element, targetElement: Element) =>
    Array.prototype.indexOf.call(parentElement.children, targetElement);

  const firstSelectedBlockIndex = getElementIndex(
    parent,
    // Expects from position to be just before the first selected block.
    view.domAtPos(from + 1).node.parentElement!
  );
  const lastSelectedBlockIndex = getElementIndex(
    parent,
    // Expects to position to be just after the last selected block.
    view.domAtPos(to - 1).node.parentElement!
  );

  for (let i = parent.childElementCount - 1; i >= 0; i--) {
    if (i > lastSelectedBlockIndex || i < firstSelectedBlockIndex) {
      parentClone.removeChild(parentClone.children[i]);
    }
  }

  // dataTransfer.setDragImage(element) only works if element is attached to the DOM.
  unsetDragImage(view.root);
  dragImageElement = parentClone;

  // TODO: This is hacky, need a better way of assigning classes to the editor so that they can also be applied to the
  //  drag preview.
  const classes = view.dom.className.split(" ");
  const inheritedClasses = classes
    .filter(
      (className) =>
        className !== "ProseMirror" &&
        className !== "bn-root" &&
        className !== "bn-editor"
    )
    .join(" ");

  dragImageElement.className =
    dragImageElement.className + " bn-drag-preview " + inheritedClasses;

  if (view.root instanceof ShadowRoot) {
    view.root.appendChild(dragImageElement);
  } else {
    view.root.body.appendChild(dragImageElement);
  }
}

function unsetDragImage(rootEl: Document | ShadowRoot) {
  if (dragImageElement !== undefined) {
    if (rootEl instanceof ShadowRoot) {
      rootEl.removeChild(dragImageElement);
    } else {
      rootEl.body.removeChild(dragImageElement);
    }

    dragImageElement = undefined;
  }
}

function dragStart<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  e: { dataTransfer: DataTransfer | null; clientY: number },
  editor: BlockNoteEditor<BSchema, I, S>
) {
  if (!e.dataTransfer) {
    return;
  }

  const view = editor.prosemirrorView;

  const editorBoundingBox = view.dom.getBoundingClientRect();

  const coords = {
    left: editorBoundingBox.left + editorBoundingBox.width / 2, // take middle of editor
    top: e.clientY,
  };

  const elements = view.root.elementsFromPoint(coords.left, coords.top);
  let blockEl = undefined;

  for (const element of elements) {
    if (view.dom.contains(element)) {
      blockEl = getDraggableBlockFromElement(element, view);
      break;
    }
  }

  if (!blockEl) {
    return;
  }

  const pos = blockPositionFromElement(blockEl.node, view);
  if (pos != null) {
    const selection = view.state.selection;
    const doc = view.state.doc;

    const { from, to } = blockPositionsFromSelection(selection, doc);

    const draggedBlockInSelection = from <= pos && pos < to;
    const multipleBlocksSelected =
      selection.$anchor.node() !== selection.$head.node() ||
      selection instanceof MultipleNodeSelection;

    if (draggedBlockInSelection && multipleBlocksSelected) {
      view.dispatch(
        view.state.tr.setSelection(MultipleNodeSelection.create(doc, from, to))
      );
      setDragImage(view, from, to);
    } else {
      view.dispatch(
        view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos))
      );
      setDragImage(view, pos);
    }

    const selectedSlice = view.state.selection.content();
    const schema = editor.pmSchema;

    const internalHTMLSerializer = createInternalHTMLSerializer(schema, editor);
    const internalHTML = internalHTMLSerializer.serializeProseMirrorFragment(
      selectedSlice.content,
      {}
    );

    const externalHTMLExporter = createExternalHTMLExporter(schema, editor);
    const externalHTML = externalHTMLExporter.exportProseMirrorFragment(
      selectedSlice.content,
      {}
    );

    const plainText = cleanHTMLToMarkdown(externalHTML);

    e.dataTransfer.clearData();
    e.dataTransfer.setData("blocknote/html", internalHTML);
    e.dataTransfer.setData("text/html", externalHTML);
    e.dataTransfer.setData("text/plain", plainText);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setDragImage(dragImageElement!, 0, 0);
    view.dragging = { slice: selectedSlice, move: true };
  }
}

export class SideMenuView<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> implements PluginView
{
  public state?: SideMenuState<BSchema, I, S>;
  public readonly emitUpdate: (state: SideMenuState<BSchema, I, S>) => void;

  private needUpdate = false;
  private mousePos: { x: number; y: number } | undefined;

  // When true, the drag handle with be anchored at the same level as root elements
  // When false, the drag handle with be just to the left of the element
  // TODO: Is there any case where we want this to be false?
  private horizontalPosAnchoredAtRoot: boolean;
  private horizontalPosAnchor: number;

  private hoveredBlock: HTMLElement | undefined;

  // Used to check if currently dragged content comes from this editor instance.
  public isDragging = false;

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

    this.horizontalPosAnchoredAtRoot = true;
    this.horizontalPosAnchor = (
      this.pmView.dom.firstChild! as HTMLElement
    ).getBoundingClientRect().x;

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

    // Unfreezes the menu whenever the user clicks.
    this.pmView.dom.addEventListener("mousedown", this.onMouseDown);
    // Hides and unfreezes the menu whenever the user presses a key.
    this.pmView.root.addEventListener(
      "keydown",
      this.onKeyDown as EventListener,
      true
    );

    // Setting capture=true ensures that any parent container of the editor that
    // gets scrolled will trigger the scroll event. Scroll events do not bubble
    // and so won't propagate to the document by default.
    this.pmView.root.addEventListener("scroll", this.onScroll, true);
  }

  updateState = () => {
    if (this.menuFrozen || !this.mousePos) {
      return;
    }

    // Editor itself may have padding or other styling which affects
    // size/position, so we get the boundingRect of the first child (i.e. the
    // blockGroup that wraps all blocks in the editor) for more accurate side
    // menu placement.
    const editorBoundingBox = (
      this.pmView.dom.firstChild! as HTMLElement
    ).getBoundingClientRect();

    this.horizontalPosAnchor = editorBoundingBox.x;

    // Gets block at mouse cursor's vertical position.
    const coords = {
      left: editorBoundingBox.left + editorBoundingBox.width / 2, // take middle of editor
      top: this.mousePos.y,
    };

    const elements = this.pmView.root.elementsFromPoint(
      coords.left,
      coords.top
    );
    let block = undefined;

    for (const element of elements) {
      if (this.pmView.dom.contains(element)) {
        block = getDraggableBlockFromElement(element, this.pmView);
        break;
      }
    }

    // Closes the menu if the mouse cursor is beyond the editor vertically.
    if (!block || !this.editor.isEditable) {
      if (this.state?.show) {
        this.state.show = false;
        this.needUpdate = true;
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

    // Shows or updates elements.
    if (this.editor.isEditable) {
      const blockContentBoundingBox = blockContent.getBoundingClientRect();

      this.state = {
        show: true,
        referencePos: new DOMRect(
          this.horizontalPosAnchoredAtRoot
            ? this.horizontalPosAnchor
            : blockContentBoundingBox.x,
          blockContentBoundingBox.y,
          blockContentBoundingBox.width,
          blockContentBoundingBox.height
        ),
        block: this.editor.getBlock(
          this.hoveredBlock!.getAttribute("data-id")!
        )!,
      };
      this.needUpdate = true;
    }
  };

  /**
   * Sets isDragging when dragging text.
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
        this.pmView.dom.firstChild! as HTMLElement
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

    if (!pos || pos.inside === -1) {
      const evt = new Event("dragover", event) as any;
      const editorBoundingBox = (
        this.pmView.dom.firstChild! as HTMLElement
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
      this.menuFrozen = false;
    }
  };

  onMouseDown = () => {
    if (this.state && this.state.show && this.menuFrozen) {
      this.menuFrozen = false;
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

    const editorWrapper = this.pmView.dom.parentElement!;

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

    this.updateState();

    if (this.needUpdate) {
      this.emitUpdate(this.state!);
      this.needUpdate = false;
    }
  };

  onScroll = () => {
    if (this.state?.show) {
      const blockContent = this.hoveredBlock!.firstChild as HTMLElement;
      const blockContentBoundingBox = blockContent.getBoundingClientRect();

      this.state.referencePos = new DOMRect(
        this.horizontalPosAnchoredAtRoot
          ? this.horizontalPosAnchor
          : blockContentBoundingBox.x,
        blockContentBoundingBox.y,
        blockContentBoundingBox.width,
        blockContentBoundingBox.height
      );
      this.emitUpdate(this.state);
    }
  };

  // Needed in cases where the editor state updates without the mouse cursor
  // moving, as some state updates can require a side menu update. For example,
  // adding a button to the side menu which removes the block can cause the
  // block below to jump up into the place of the removed block when clicked,
  // allowing the user to click the button again without moving the cursor. This
  // would otherwise not update the side menu, and so clicking the button again
  // would attempt to remove the same block again, causing an error.
  update() {
    const prevBlockId = this.state?.block.id;

    this.updateState();

    if (this.needUpdate && this.state && prevBlockId !== this.state.block.id) {
      this.emitUpdate(this.state);
      this.needUpdate = false;
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
    this.pmView.root.removeEventListener("scroll", this.onScroll, true);
    this.pmView.dom.removeEventListener("mousedown", this.onMouseDown);
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

    const blockContent = this.hoveredBlock!.firstChild! as HTMLElement;
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
