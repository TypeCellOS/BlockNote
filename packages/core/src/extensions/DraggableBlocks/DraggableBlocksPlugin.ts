import { Node } from "prosemirror-model";
import { NodeSelection, Plugin, PluginKey, Selection } from "prosemirror-state";
import * as pv from "prosemirror-view";
import { EditorView } from "prosemirror-view";
// import { BlockNoteTheme } from "../../BlockNoteTheme";
import { MultipleNodeSelection } from "../Blocks/MultipleNodeSelection";
import { DraggableBlocksOptions } from "./DraggableBlocksExtension";
import {
  AddBlockButtonParams,
  DragHandleMenuParams,
  DragHandleParams,
} from "./DragMenuFactoryTypes";
import { getBlockInfoFromPos } from "../Blocks/helpers/getBlockInfoFromPos";
import { SlashMenuPluginKey } from "../SlashMenu/SlashMenuExtension";

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

export const createDraggableBlocksPlugin = (
  options: DraggableBlocksOptions
) => {
  // When true, the drag handle with be anchored at the same level as root elements
  // When false, the drag handle with be just to the left of the element
  const horizontalPosAnchoredAtRoot = true;
  // Determines if the drag handle and add block buttons should be visible. Gets set to true on mouse move events. Gets
  // set to false on mouse click and key down events.
  let blockButtonsVisible = false;
  // Determines if the drag handle and add block buttons should be frozen, i.e. should not update on mouse move. Gets
  // set to true when clicking the add block button. Gets set to false on mouse click and key down events.
  let blockButtonsFrozen = false;

  // Declares callback functions for use for params in drag handle, drag handle menu, and add block button factories.
  function addBlock(coords: { left: number; top: number }) {
    blockButtonsFrozen = true;

    const pos = options.editor.view.posAtCoords(coords);
    if (!pos) {
      return;
    }

    const blockInfo = getBlockInfoFromPos(options.editor.state.doc, pos.pos);
    if (blockInfo === undefined) {
      return;
    }

    const { contentNode, endPos } = blockInfo;

    // Creates a new block if current one is not empty for the suggestion menu to open in.
    if (contentNode.textContent.length !== 0) {
      const newBlockInsertionPos = endPos + 1;
      const newBlockContentPos = newBlockInsertionPos + 2;

      options.editor
        .chain()
        .BNCreateBlock(newBlockInsertionPos)
        .BNSetContentType(newBlockContentPos, "textContent")
        .setTextSelection(newBlockContentPos)
        .run();
    }

    // Focuses and activates the suggestion menu.
    options.editor.view.focus();
    options.editor.view.dispatch(
      options.editor.view.state.tr
        .scrollIntoView()
        .setMeta(SlashMenuPluginKey, {
          // TODO import suggestion plugin key
          activate: true,
          type: "drag",
        })
    );
  }

  function deleteBlock(coords: { left: number; top: number }) {
    dragHandleMenu.hide();

    const pos = options.editor.view.posAtCoords(coords);
    if (!pos) {
      return;
    }

    options.editor.commands.BNDeleteBlock(pos.pos);
  }

  // Initializes params for use in drag handle, drag handle menu, and add block button factories.
  const addBlockButtonParams: AddBlockButtonParams = {
    addBlock: () => addBlock({ left: 0, top: 0 }),
    blockBoundingBox: new DOMRect(),
  };
  const dragHandleParams: DragHandleParams = {
    blockBoundingBox: new DOMRect(),
  };
  const dragHandleMenuParams: DragHandleMenuParams = {
    deleteBlock: () => deleteBlock({ left: 0, top: 0 }),
    dragHandleBoundingBox: new DOMRect(),
  };

  // Creates drag handle, drag handle menu, and add block button editor elements.
  const addBlockButton = options.addBlockButtonFactory(addBlockButtonParams);
  const dragHandle = options.dragHandleFactory(dragHandleParams);
  const dragHandleMenu = options.dragHandleMenuFactory(dragHandleMenuParams);

  // Declares additional listeners to attach to the drag handle element for drag/drop & menu opening.
  const dragStartCallback = (event: DragEvent) =>
    dragStart(event, options.editor.view);
  const dragEndCallback = (_event: DragEvent) => unsetDragImage();
  const clickCallback = (_event: MouseEvent) => {
    dragHandleMenu.show(dragHandleMenuParams);
    blockButtonsFrozen = true;
  };

  function addDragHandleListeners() {
    dragHandle.element!.addEventListener("dragstart", dragStartCallback);
    dragHandle.element!.addEventListener("dragend", dragEndCallback);
    dragHandle.element!.addEventListener("click", clickCallback);
  }

  function removeDragHandleListeners() {
    dragHandle.element!.removeEventListener("dragstart", dragStartCallback);
    dragHandle.element!.removeEventListener("dragend", dragEndCallback);
    dragHandle.element!.removeEventListener("click", clickCallback);
  }

  // Hides drag handle, drag handle menu, and add block button when scrolling.
  window.addEventListener("scroll", () => {
    blockButtonsVisible = false;
    blockButtonsFrozen = false;

    addBlockButton.hide();
    dragHandle.hide();
    removeDragHandleListeners();
    dragHandleMenu.hide();
  });

  return new Plugin({
    key: new PluginKey("DraggableBlocksPlugin"),
    view() {
      return {
        destroy() {
          addBlockButton.hide();
          dragHandle.hide();
          removeDragHandleListeners();
          dragHandleMenu.hide();
        },
      };
    },
    props: {
      // handleDOMEvents: {

      // },
      //   handleDOMEvents: {
      //     dragend(view, event) {
      //       //   setTimeout(() => {
      //       //     let node = document.querySelector(".ProseMirror-hideselection");
      //       //     if (node) {
      //       //       node.classList.remove("ProseMirror-hideselection");
      //       //     }
      //       //   }, 50);
      //       return true;
      //     },
      handleKeyDown(_view, _event) {
        blockButtonsVisible = false;
        blockButtonsFrozen = false;

        addBlockButton.hide();
        dragHandle.hide();
        removeDragHandleListeners();

        return false;
      },
      handleDOMEvents: {
        // drag(view, event) {
        //   // event.dataTransfer!.;
        //   return false;
        // },
        mouseleave(_view, _event: any) {
          // TODO
          // dropElement.style.display = "none";
          return true;
        },
        mousedown(_view, _event: any) {
          blockButtonsVisible = false;
          blockButtonsFrozen = false;

          addBlockButton.hide();
          dragHandle.hide();
          removeDragHandleListeners();
          dragHandleMenu.hide();

          return false;
        },
        mousemove(view, event: any) {
          if (blockButtonsFrozen) {
            return true;
          }

          // Gets block at mouse Y coordinate.
          const coords = {
            left: view.dom.clientWidth / 2, // take middle of editor
            top: event.clientY,
          };
          const block = getDraggableBlockFromCoords(coords, view);

          if (!block) {
            console.warn("Perhaps we should hide element?");
            return true;
          }

          // I want the dim of the blocks content node
          // because if the block contains other blocks
          // Its dims change, moving the position of the drag handle
          const blockContent = block.node.firstChild as HTMLElement;

          if (!blockContent) {
            return true;
          }

          // Gets bounding box of relevant block.
          const blockBoundingBox = blockContent.getBoundingClientRect();
          blockBoundingBox.x = horizontalPosAnchoredAtRoot
            ? getHorizontalAnchor()
            : blockBoundingBox.left;

          // Updates element params.
          addBlockButtonParams.addBlock = () =>
            addBlock({
              left: blockBoundingBox.left,
              top: blockBoundingBox.top,
            });
          addBlockButtonParams.blockBoundingBox = blockBoundingBox;

          dragHandleParams.blockBoundingBox = blockBoundingBox;

          dragHandleMenuParams.deleteBlock = () =>
            deleteBlock({
              left: blockBoundingBox.left,
              top: blockBoundingBox.top,
            });
          dragHandleMenuParams.dragHandleBoundingBox = blockBoundingBox;

          // Shows or updates elements.
          if (!blockButtonsVisible) {
            blockButtonsVisible = true;

            dragHandle.show(dragHandleParams);
            addBlockButton.show(addBlockButtonParams);

            dragHandle.element!.setAttribute("draggable", "true");
            addDragHandleListeners();
          } else {
            dragHandle.update(dragHandleParams);
            addBlockButton.update(addBlockButtonParams);
          }

          return true;
        },
      },
    },
  });
};
