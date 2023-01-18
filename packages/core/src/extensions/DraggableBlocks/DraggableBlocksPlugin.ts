import { Editor } from "@tiptap/core";
import { Node } from "prosemirror-model";
import { NodeSelection, Plugin, PluginKey, Selection } from "prosemirror-state";
import * as pv from "prosemirror-view";
import { EditorView } from "prosemirror-view";
import { MultipleNodeSelection } from "../Blocks/MultipleNodeSelection";
import { DraggableBlocksOptions } from "./DraggableBlocksExtension";
import {
  BlockSideMenu,
  BlockSideMenuDynamicParams,
  BlockSideMenuFactory,
  BlockSideMenuStaticParams,
} from "./BlockSideMenuFactoryTypes";
import { getBlockInfoFromPos } from "../Blocks/helpers/getBlockInfoFromPos";
import { SlashMenuPluginKey } from "../SlashMenu/SlashMenuExtension";
import styles from "../../editor.module.css";

const serializeForClipboard = (pv as any).__serializeForClipboard;
// code based on https://github.com/ueberdosis/tiptap/issues/323#issuecomment-506637799

let horizontalAnchor: number;
let dragImageElement: Element | undefined;

function getHorizontalAnchor() {
  if (!horizontalAnchor) {
    const firstBlockGroup = document.querySelector(
      ".ProseMirror > [class*='blockGroup']"
    ) as HTMLElement | undefined; // first block group node
    if (firstBlockGroup) {
      horizontalAnchor = absoluteRect(firstBlockGroup).left;
    } // Anchor to the left of the first block group
  }
  return horizontalAnchor;
}

export function createRect(rect: DOMRect) {
  let newRect = {
    left: rect.left + document.body.scrollLeft,
    top: rect.top + document.body.scrollTop,
    width: rect.width,
    height: rect.height,
    bottom: 0,
    right: 0,
  };
  newRect.bottom = newRect.top + newRect.height;
  newRect.right = newRect.left + newRect.width;
  return newRect;
}

export function absoluteRect(element: HTMLElement) {
  return createRect(element.getBoundingClientRect());
}

function getDraggableBlockFromCoords(
  coords: { left: number; top: number },
  view: EditorView
) {
  let pos = view.posAtCoords(coords);
  if (!pos) {
    return undefined;
  }
  let node = view.domAtPos(pos.pos).node as HTMLElement;

  if (node === view.dom) {
    // mouse over root
    return undefined;
  }

  while (
    node &&
    node.parentNode &&
    node.parentNode !== view.dom &&
    !node.hasAttribute?.("data-id")
  ) {
    node = node.parentNode as HTMLElement;
  }
  if (!node) {
    return undefined;
  }
  return { node, id: node.getAttribute("data-id")! };
}

function blockPositionFromCoords(
  coords: { left: number; top: number },
  view: EditorView
) {
  let block = getDraggableBlockFromCoords(coords, view);

  if (block && block.node.nodeType === 1) {
    // TODO: this uses undocumented PM APIs? do we need this / let's add docs?
    const docView = (view as any).docView;
    let desc = docView.nearestDesc(block.node, true);
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
  dragImageElement = parentClone;
  dragImageElement.className = styles.dragPreview;
  document.body.appendChild(dragImageElement);
}

function unsetDragImage() {
  if (dragImageElement !== undefined) {
    document.body.removeChild(dragImageElement);
    dragImageElement = undefined;
  }
}

function dragStart(e: DragEvent, view: EditorView) {
  if (!e.dataTransfer) {
    return;
  }

  let coords = {
    left: view.dom.clientWidth / 2, // take middle of editor
    top: e.clientY,
  };

  let pos = blockPositionFromCoords(coords, view);
  if (pos != null) {
    const selection = view.state.selection;
    const doc = view.state.doc;

    const { from, to } = blockPositionsFromSelection(selection, doc);

    const draggedBlockInSelection = from <= pos && pos < to;
    const multipleBlocksSelected = !selection.$anchor
      .node()
      .eq(selection.$head.node());

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

    let slice = view.state.selection.content();
    let { dom, text } = serializeForClipboard(view, slice);

    e.dataTransfer.clearData();
    e.dataTransfer.setData("text/html", dom.innerHTML);
    e.dataTransfer.setData("text/plain", text);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setDragImage(dragImageElement!, 0, 0);
    view.dragging = { slice, move: true };
  }
}

export type BlockMenuViewProps = {
  editor: Editor;
  blockMenuFactory: BlockSideMenuFactory;
  horizontalPosAnchoredAtRoot: boolean;
};

export class BlockMenuView {
  editor: Editor;

  // When true, the drag handle with be anchored at the same level as root elements
  // When false, the drag handle with be just to the left of the element
  horizontalPosAnchoredAtRoot: boolean;

  blockMenu: BlockSideMenu;

  hoveredBlock: HTMLElement | undefined;

  menuOpen = false;
  menuFrozen = false;

  constructor({
    editor,
    blockMenuFactory,
    horizontalPosAnchoredAtRoot,
  }: BlockMenuViewProps) {
    this.editor = editor;
    this.horizontalPosAnchoredAtRoot = horizontalPosAnchoredAtRoot;

    this.blockMenu = blockMenuFactory(this.getStaticParams());

    // Shows or updates menu position whenever the cursor moves, if the menu isn't frozen.
    document.body.addEventListener(
      "mousemove",
      (event) => {
        if (this.menuFrozen) {
          return;
        }

        // Gets block at mouse cursor's vertical position.
        const coords = {
          left: this.editor.view.dom.clientWidth / 2, // take middle of editor
          top: event.clientY,
        };
        const block = getDraggableBlockFromCoords(coords, this.editor.view);

        // Closes the menu if the mouse cursor is beyond the editor vertically.
        if (!block) {
          if (this.menuOpen) {
            this.menuOpen = false;
            this.blockMenu.hide();
          }

          return;
        }

        // Doesn't update if the menu is already open and the mouse cursor is still hovering the same block.
        if (
          this.menuOpen &&
          this.hoveredBlock?.hasAttribute("data-id") &&
          this.hoveredBlock?.getAttribute("data-id") === block.id
        ) {
          return;
        }

        // Gets the block's content node, which lets to ignore child blocks when determining the block menu's position.
        const blockContent = block.node.firstChild as HTMLElement;
        this.hoveredBlock = blockContent;

        if (!blockContent) {
          return;
        }

        // Shows or updates elements.
        if (!this.menuOpen) {
          this.menuOpen = true;
          this.blockMenu.render(this.getDynamicParams(), true);
        } else {
          this.blockMenu.render(this.getDynamicParams(), false);
        }
      },
      true
    );

    // Hides and unfreezes the menu whenever the user selects the editor with the mouse or presses a key.
    // TODO: Better integration with suggestions menu and only editor scope?
    document.body.addEventListener(
      "mousedown",
      (event) => {
        if (this.blockMenu.element?.contains(event.target as HTMLElement)) {
          return;
        }

        if (this.menuOpen) {
          this.menuOpen = false;
          this.blockMenu.hide();
        }

        this.menuFrozen = false;
      },
      true
    );
    document.body.addEventListener(
      "keydown",
      () => {
        if (this.menuOpen) {
          this.menuOpen = false;
          this.blockMenu.hide();
        }

        this.menuFrozen = false;
      },
      true
    );
  }

  destroy() {
    if (this.menuOpen) {
      this.menuOpen = false;
      this.blockMenu.hide();
    }
  }

  addBlock() {
    this.menuOpen = false;
    this.menuFrozen = true;
    this.blockMenu.hide();

    const blockBoundingBox = this.hoveredBlock!.getBoundingClientRect();

    const pos = this.editor.view.posAtCoords({
      left: blockBoundingBox.left,
      top: blockBoundingBox.top,
    });
    if (!pos) {
      return;
    }

    const blockInfo = getBlockInfoFromPos(this.editor.state.doc, pos.pos);
    if (blockInfo === undefined) {
      return;
    }

    const { contentNode, endPos } = blockInfo;

    // Creates a new block if current one is not empty for the suggestion menu to open in.
    if (contentNode.textContent.length !== 0) {
      const newBlockInsertionPos = endPos + 1;
      const newBlockContentPos = newBlockInsertionPos + 2;

      this.editor
        .chain()
        .BNCreateBlock(newBlockInsertionPos)
        .BNSetContentType(newBlockContentPos, { name: "textContent" })
        .setTextSelection(newBlockContentPos)
        .run();
    }

    // Focuses and activates the suggestion menu.
    this.editor.view.focus();
    this.editor.view.dispatch(
      this.editor.view.state.tr.scrollIntoView().setMeta(SlashMenuPluginKey, {
        // TODO import suggestion plugin key
        activate: true,
        type: "drag",
      })
    );
  }

  deleteBlock() {
    this.menuOpen = false;
    this.blockMenu.hide();

    const blockBoundingBox = this.hoveredBlock!.getBoundingClientRect();

    const pos = this.editor.view.posAtCoords({
      left: blockBoundingBox.left,
      top: blockBoundingBox.top,
    });
    if (!pos) {
      return;
    }

    this.editor.commands.BNDeleteBlock(pos.pos);
  }

  getStaticParams(): BlockSideMenuStaticParams {
    return {
      addBlock: () => this.addBlock(),
      deleteBlock: () => this.deleteBlock(),
      blockDragStart: (event: DragEvent) => dragStart(event, this.editor.view),
      blockDragEnd: () => unsetDragImage(),
      freezeMenu: () => {
        this.menuFrozen = true;
      },
      unfreezeMenu: () => {
        this.menuFrozen = false;
      },
    };
  }

  getDynamicParams(): BlockSideMenuDynamicParams {
    const blockBoundingBox = this.hoveredBlock!.getBoundingClientRect();

    return {
      blockBoundingBox: new DOMRect(
        this.horizontalPosAnchoredAtRoot
          ? getHorizontalAnchor()
          : blockBoundingBox.x,
        blockBoundingBox.y,
        blockBoundingBox.width,
        blockBoundingBox.height
      ),
    };
  }
}

export const createDraggableBlocksPlugin = (
  options: DraggableBlocksOptions
) => {
  return new Plugin({
    key: new PluginKey("DraggableBlocksPlugin"),
    view: () =>
      new BlockMenuView({
        editor: options.editor,
        blockMenuFactory: options.blockSideMenuFactory,
        horizontalPosAnchoredAtRoot: true,
      }),
  });
};
