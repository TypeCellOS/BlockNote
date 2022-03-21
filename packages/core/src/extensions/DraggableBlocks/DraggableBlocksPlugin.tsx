import { NodeSelection, Plugin, PluginKey } from "prosemirror-state";
import { EditorView, __serializeForClipboard } from "prosemirror-view";
import ReactDOM from "react-dom";
import { DragHandle } from "./components/DragHandle";

import React from "react";

// code based on https://github.com/ueberdosis/tiptap/issues/323#issuecomment-506637799

let horizontalAnchor: number;
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

function blockPosAtCoords(
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

function dragStart(e: DragEvent, view: EditorView) {
  if (!e.dataTransfer) {
    return;
  }

  let coords = {
    left: view.dom.clientWidth / 2, // take middle of editor
    top: e.clientY,
  };
  let pos = blockPosAtCoords(coords, view);
  if (pos != null) {
    view.dispatch(
      view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos))
    );

    let slice = view.state.selection.content();
    let { dom, text } = __serializeForClipboard(view, slice);

    e.dataTransfer.clearData();
    e.dataTransfer.setData("text/html", dom.innerHTML);
    e.dataTransfer.setData("text/plain", text);
    e.dataTransfer.effectAllowed = "move";
    const block = getDraggableBlockFromCoords(coords, view);
    e.dataTransfer.setDragImage(block?.node as any, 0, 0);
    view.dragging = { slice, move: true };
  }
}

export const createDraggableBlocksPlugin = () => {
  let dropElement: HTMLElement | undefined;

  const WIDTH = 48;

  // When true, the drag handle with be anchored at the same level as root elements
  // When false, the drag handle with be just to the left of the element
  const horizontalPosAnchoredAtRoot = true;

  let menuShown = false;

  const onShow = () => {
    menuShown = true;
  };
  const onHide = () => {
    menuShown = false;
  };

  return new Plugin({
    key: new PluginKey("DraggableBlocksPlugin"),
    view(editorView) {
      dropElement = document.createElement("div");
      dropElement.setAttribute("draggable", "true");
      dropElement.style.position = "absolute";
      dropElement.style.height = "24px"; // default height
      document.body.append(dropElement);

      dropElement.addEventListener("dragstart", (e) =>
        dragStart(e, editorView)
      );

      return {
        // update(view, prevState) {},
        destroy() {
          if (!dropElement) {
            throw new Error("unexpected");
          }
          dropElement.parentNode!.removeChild(dropElement);
          dropElement = undefined;
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
        if (!dropElement) {
          throw new Error("unexpected");
        }
        menuShown = false;
        ReactDOM.render(<></>, dropElement);
        return false;
      },
      handleDOMEvents: {
        // drag(view, event) {
        //   // event.dataTransfer!.;
        //   return false;
        // },
        mouseleave(_view, _event) {
          if (!dropElement) {
            throw new Error("unexpected");
          }
          // TODO
          // dropElement.style.display = "none";
          return true;
        },
        mousemove(view, event) {
          if (!dropElement) {
            throw new Error("unexpected");
          }
          if (menuShown) {
            // The submenu is open, don't move draghandle
            return true;
          }
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

          const rect = absoluteRect(blockContent);
          const win = block.node.ownerDocument.defaultView!;
          const dropElementRect = dropElement.getBoundingClientRect();
          const left =
            (horizontalPosAnchoredAtRoot ? getHorizontalAnchor() : rect.left) -
            WIDTH +
            win.pageXOffset;
          rect.top +=
            rect.height / 2 - dropElementRect.height / 2 + win.pageYOffset;

          console.log(rect.top);

          dropElement.style.left = left + "px";
          dropElement.style.top = rect.top + "px";

          ReactDOM.render(
            <DragHandle
              onShow={onShow}
              onHide={onHide}
              key={block.id + ""}
              view={view}
              coords={coords}
            />,
            dropElement
          );
          return true;
        },
      },
    },
  });
};
