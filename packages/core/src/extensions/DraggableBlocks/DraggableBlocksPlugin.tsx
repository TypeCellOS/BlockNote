import { NodeSelection, Plugin, PluginKey } from "prosemirror-state";
import { EditorView, __serializeForClipboard } from "prosemirror-view";
import ReactDOM from "react-dom";
import { DragHandle } from "./components/DragHandle";

import React from "react";

interface Coordinates {
  top: number;
  left: number;
}

// code based on https://github.com/ueberdosis/tiptap/issues/323#issuecomment-506637799
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

function blockPosAtCoords(coords: Coordinates, view: EditorView) {
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

function getDraggableBlockFromCoords(coords: Coordinates, view: EditorView) {
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

  let horizontalAnchor: number; // Where to anchor the draghandle on the x axis

  const WIDTH = 48; // Width of drag handle

  // When true, the drag handle with be anchored at the same level as root elements
  // When false, the drag handle with be just to the left of the element
  const horizontalPosAnchoredAtRoot = true;

  let menuShown = false;
  let addClicked = false;

  const onShow = () => {
    menuShown = true;
  };
  const onHide = () => {
    menuShown = false;
  };
  const onAddClicked = () => {
    addClicked = true;
  };

  /**
   * If the horizontal anchor has not been set or if update param is true
   * it calculates it
   * @param update if true calculate the horizontal anchor
   * @returns horizontal anchor
   */
  function getHorizontalAnchor(update = false) {
    if (update || !horizontalAnchor) {
      const firstBlockGroup = document.querySelector(
        ".ProseMirror > [class*='blockGroup']"
      ) as HTMLElement | undefined; // first block group node
      // Anchor to the left of the first block group
      if (firstBlockGroup) {
        horizontalAnchor = absoluteRect(firstBlockGroup).left;
      }
    }
    return horizontalAnchor;
  }

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

      //Update the horizontal anchor
      const posHandler = () => {
        getHorizontalAnchor(true);
      };
      return {
        update(_view, _prevState) {
          // On each new view add resize handler
          window.addEventListener("resize", posHandler);
        },
        destroy() {
          if (!dropElement) {
            throw new Error("unexpected");
          }
          dropElement.parentNode!.removeChild(dropElement);
          dropElement = undefined;
          // Remove resize listener
          window.removeEventListener("resize", posHandler);
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
        addClicked = false;
        ReactDOM.render(<></>, dropElement);
        return false;
      },

      handleDOMEvents: {
        // drag(view, event) {
        //   // event.dataTransfer!.;
        //   return false;
        // },
        mouseleave(view, event) {
          if (!dropElement) {
            throw new Error("unexpected");
          }

          // Hide the drop element when the mouse leaves the editor from the bottom
          // This is not in mouse move because the mouse leaving the bottom of the editor
          // Is not detected there
          if (event.clientY > view.dom.clientTop + view.dom.clientHeight) {
            menuShown = false;
            addClicked = false;
            ReactDOM.render(<></>, dropElement);
          }
          return true;
        },
        mousedown(_view, _event) {
          if (!dropElement) {
            throw new Error("unexpected");
          }
          menuShown = false;
          addClicked = false;
          ReactDOM.render(<></>, dropElement);
          return false;
        },
        mousemove(view, event) {
          const coords = {
            left: view.dom.clientWidth / 2, // take middle of editor
            top: event.clientY,
          };
          if (!dropElement) {
            throw new Error("unexpected");
          }

          if (menuShown || addClicked) {
            // The submenu is open, don't move draghandle
            // Or if the user clicked the add button
            return true;
          }

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

          dropElement.style.left = left + "px";
          dropElement.style.top = rect.top + "px";

          // Check whether mouse is in block or not so we can hide draghandle
          const mouseInBlock =
            rect.left - WIDTH + win.pageXOffset < event.clientX && // Left bound
            rect.left + rect.width + win.pageXOffset > event.clientX && // Right bound
            rect.top - win.pageYOffset < event.clientY; // Top bound

          ReactDOM.render(
            mouseInBlock ? (
              <DragHandle
                onShow={onShow}
                onHide={onHide}
                onAddClicked={onAddClicked}
                key={block.id + ""}
                view={view}
                coords={coords}
              />
            ) : (
              <></>
            ),
            dropElement
          );
          return true;
        },
      },
    },
  });
};
