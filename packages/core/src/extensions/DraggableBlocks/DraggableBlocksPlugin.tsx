import { NodeSelection, Plugin, PluginKey } from "prosemirror-state";
import { EditorView, __serializeForClipboard } from "prosemirror-view";
import ReactDOM from "react-dom";
import { DragHandle } from "./components/DragHandle";

import React from "react";

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

  const WIDTH = 24;

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

          const rect = absoluteRect(block.node);
          const win = block.node.ownerDocument.defaultView!;
          const dropElementRect = dropElement.getBoundingClientRect();
          // rect.top += rect.height / 2 - 15;
          rect.top += rect.height / 2 + dropElementRect.height / 2;
          rect.left += win.pageXOffset;

          dropElement.style.left = -WIDTH + rect.left + "px";
          dropElement.style.top = `calc(${rect.top}px - 1.5em)`; // This calc deducts the height of the blocks content

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
