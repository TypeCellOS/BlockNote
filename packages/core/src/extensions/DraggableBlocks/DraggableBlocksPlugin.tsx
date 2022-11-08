import { NodeSelection, Plugin, PluginKey } from "prosemirror-state";
import * as pv from "prosemirror-view";
import { EditorView } from "prosemirror-view";
import ReactDOM from "react-dom";
import { DragHandle } from "./components/DragHandle";
import { MantineProvider } from "@mantine/core";
import { BlockNoteTheme } from "../../BlockNoteTheme";
import { MultipleNodeSelection } from "../Blocks/MultipleNodeSelection";

const serializeForClipboard = (pv as any).__serializeForClipboard;
// code based on https://github.com/ueberdosis/tiptap/issues/323#issuecomment-506637799

let horizontalAnchor: number;
let dragImageElement: Element;

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

function getElementIndex(parentElement: Element, targetElement: Element) {
  return Array.prototype.indexOf.call(parentElement.children, targetElement);
}

function setDragImage(view: EditorView, from: number, to = from) {
  // Gets parent node.
  const parent = view.domAtPos(from).node as Element;
  const parentClone = view.domAtPos(from).node.cloneNode(true) as Element;

  const leadingNodes = getElementIndex(
    parent,
    view.domAtPos(from + 1).node.parentElement!
  );
  const trailingNodes = getElementIndex(
    parent,
    view.domAtPos(to - 1).node.parentElement!
  );

  for (let i = parent.childElementCount - 1; i >= 0; i--) {
    if (i > trailingNodes || i < leadingNodes) {
      parentClone.removeChild(parentClone.children[i]);
    }
  }

  dragImageElement = parentClone;
  document.body.appendChild(dragImageElement);
}

function unsetDragImage() {
  document.body.removeChild(dragImageElement);
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
    // pos is shifted slightly to ensure it's inside a block content node like the selection from and to positions.
    pos += 2;
    let selection = view.state.selection;

    // Final selection positions.
    let fromPos: number;
    let toPos: number;

    // Even the user starts dragging blocks but drops them in the same place, the selection will still update to
    // new positions just before & just after the target blocks, and therefore should not change if they try to drag the
    // same blocks again. If this happens, the anchor & head move out of the block content node they were originally in.
    // If the anchor should update but the head shouldn't and vice versa, it means the user selection is outside a
    // block content node, which should never happen.
    const startShouldUpdate =
      view.state.doc.resolve(selection.from).node().type.name === "content";
    const endShouldUpdate =
      view.state.doc.resolve(selection.to).node().type.name === "content";

    // Ensures that entire outermost nodes are selected if the selection spans multiple nesting levels.
    const minDepth = Math.min(selection.$anchor.depth, selection.$head.depth);

    if (startShouldUpdate && endShouldUpdate) {
      // Absolute positions at the start of the first block in the selection and at the end of the last block. User
      // selections will always start and end in block content nodes, but we want the start and end positions of their
      // parent block nodes, which is why minDepth - 1 is used.
      const startBlockPos = selection.$from.start(minDepth - 1);
      const endBlockPos = selection.$to.end(minDepth - 1);

      // Absolute positions just before the first block in the selection, and just after the last block. Having the
      // selection start and end just before and just after the target blocks ensures no whitespace/line breaks are left
      // behind after dropping them.
      const beforeStartBlockPos = view.state.doc.resolve(startBlockPos - 1).pos;
      const afterEndBlockPos = view.state.doc.resolve(endBlockPos + 1).pos;

      fromPos = beforeStartBlockPos;
      toPos = afterEndBlockPos;
    } else {
      fromPos = selection.from;
      toPos = selection.to;
    }

    // Checks if the current selection spans the block that the visible drag handle being used corresponds to.
    const draggingSelected =
      selection.$to.end() > pos && pos >= selection.$from.start();

    view.dispatch(
      view.state.tr.setSelection(
        draggingSelected
          ? MultipleNodeSelection.create(view.state.doc, fromPos, toPos)
          : NodeSelection.create(view.state.doc, pos)
      )
    );

    let slice = view.state.selection.content();
    let { dom, text } = serializeForClipboard(view, slice);

    e.dataTransfer.clearData();
    e.dataTransfer.setData("text/html", dom.innerHTML);
    e.dataTransfer.setData("text/plain", text);
    e.dataTransfer.effectAllowed = "move";
    draggingSelected
      ? setDragImage(view, fromPos, toPos)
      : setDragImage(view, pos);
    e.dataTransfer.setDragImage(dragImageElement, 0, 0);
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
      dropElement.addEventListener("dragend", () => unsetDragImage());

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
        addClicked = false;
        ReactDOM.render(<></>, dropElement);
        return false;
      },
      handleDOMEvents: {
        // drag(view, event) {
        //   // event.dataTransfer!.;
        //   return false;
        // },
        mouseleave(_view, _event: any) {
          if (!dropElement) {
            throw new Error("unexpected");
          }
          // TODO
          // dropElement.style.display = "none";
          return true;
        },
        mousedown(_view, _event: any) {
          if (!dropElement) {
            throw new Error("unexpected");
          }
          menuShown = false;
          addClicked = false;
          ReactDOM.render(<></>, dropElement);
          return false;
        },
        mousemove(view, event: any) {
          if (!dropElement) {
            throw new Error("unexpected");
          }

          if (menuShown || addClicked) {
            // The submenu is open, don't move draghandle
            // Or if the user clicked the add button
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

          dropElement.style.left = left + "px";
          dropElement.style.top = rect.top + "px";

          ReactDOM.render(
            <MantineProvider theme={BlockNoteTheme}>
              <DragHandle
                onShow={onShow}
                onHide={onHide}
                onAddClicked={onAddClicked}
                key={block.id + ""}
                view={view}
                coords={coords}
              />
            </MantineProvider>,
            dropElement
          );
          return true;
        },
      },
    },
  });
};
