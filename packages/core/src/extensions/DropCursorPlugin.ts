import { EditorState, Plugin } from "prosemirror-state";
import { dropPoint } from "prosemirror-transform";
import { EditorView } from "prosemirror-view";
import { getBlockInfoFromPos } from "../api/getBlockInfoFromPos";
import type { BlockNoteEditor } from "../editor/BlockNoteEditor";

function eventCoords(event: MouseEvent) {
  return { left: event.clientX, top: event.clientY };
}

interface DropCursorOptions {
  /// The color of the cursor. Defaults to `black`. Use `false` to apply no color and rely only on class.
  color?: string | false;

  /// The precise width of the cursor in pixels. Defaults to 1.
  width?: number;

  /// A CSS class name to add to the cursor element.
  class?: string;
}

/// Create a plugin that, when added to a ProseMirror instance,
/// causes a decoration to show up at the drop position when something
/// is dragged over the editor.
///
/// Nodes may add a `disableDropCursor` property to their spec to
/// control the showing of a drop cursor inside them. This may be a
/// boolean or a function, which will be called with a view and a
/// position, and should return a boolean.
export function dropCursor(
  editor: BlockNoteEditor<any, any, any>,
  options: DropCursorOptions = {}
): Plugin {
  return new Plugin({
    view(editorView) {
      return new DropCursorView(editorView, options);
    },
    props: {
      handleDrop(view, event, slice, moved) {
        const eventPos = view.posAtCoords(eventCoords(event));

        if (!eventPos) {
          throw new Error("Could not get event position");
        }

        let blockInfo = getBlockInfoFromPos(view.state.doc, eventPos.pos);

        if (!blockInfo) {
          return false;
        }

        if (blockInfo.parent()?.type.name === "column") {
          blockInfo = blockInfo.parent()!;
        }

        const blockElement = view.domAtPos(blockInfo.startPos).node;
        const blockRect = (blockElement as HTMLElement).getBoundingClientRect();
        let position: "regular" | "left" | "right" = "regular";
        if (event.clientX <= blockRect.left + blockRect.width * 0.1) {
          position = "left";
        }
        if (event.clientX >= blockRect.right - blockRect.width * 0.1) {
          position = "right";
        }

        if (position === "regular") {
          return false;
        }

        const draggedBlock = editor.prosemirrorNodeToBlock(
          slice.content.child(0)
        );

        const block = blockInfo.block(editor);
        if (block.type === "column") {
          // insert new column in existing columnList
          const columnList = blockInfo.parent()!.block(editor);
          const index = columnList.children.findIndex((b) => b === block);
          const newChildren = columnList.children.toSpliced(
            position === "left" ? index : index + 1,
            0,
            draggedBlock
          );
          editor.removeBlocks([draggedBlock]);
          editor.updateBlock(columnList, {
            children: newChildren,
          });
        } else {
          // create new columnList with blocks as columns
          const blocks =
            position === "left" ? [draggedBlock, block] : [block, draggedBlock];
          editor.removeBlocks([draggedBlock]);
          editor.replaceBlocks(
            [block],
            [
              {
                type: "columnList",
                children: blocks.map((b) => {
                  return {
                    type: "column",
                    children: [b],
                  };
                }),
              },
            ]
          );
        }

        return true;
      },
    },
  });
}

class DropCursorView {
  width: number;
  color: string | undefined;
  class: string | undefined;
  cursorPos:
    | { pos: number; position: "left" | "right" | "regular" }
    | undefined = undefined;
  element: HTMLElement | null = null;
  timeout: ReturnType<typeof setTimeout> | undefined = undefined;
  handlers: { name: string; handler: (event: Event) => void }[];

  constructor(readonly editorView: EditorView, options: DropCursorOptions) {
    this.width = options.width ?? 1;
    this.color = options.color === false ? undefined : options.color || "black";
    this.class = options.class;

    this.handlers = ["dragover", "dragend", "drop", "dragleave"].map((name) => {
      const handler = (e: Event) => {
        (this as any)[name](e);
      };
      editorView.dom.addEventListener(name, handler);
      return { name, handler };
    });
  }

  destroy() {
    this.handlers.forEach(({ name, handler }) =>
      this.editorView.dom.removeEventListener(name, handler)
    );
  }

  update(editorView: EditorView, prevState: EditorState) {
    if (this.cursorPos != null && prevState.doc !== editorView.state.doc) {
      if (this.cursorPos.pos > editorView.state.doc.content.size) {
        this.setCursor(undefined);
      } else {
        // update overlay because document has changed
        this.updateOverlay();
      }
    }
  }

  setCursor(
    cursorPos:
      | { pos: number; position: "left" | "right" | "regular" }
      | undefined
  ) {
    if (
      cursorPos === this.cursorPos ||
      (cursorPos?.pos === this.cursorPos?.pos &&
        cursorPos?.position === this.cursorPos?.position)
    ) {
      // no change
      return;
    }
    this.cursorPos = cursorPos;
    if (!cursorPos) {
      this.element!.parentNode!.removeChild(this.element!);
      this.element = null;
    } else {
      // update overlay because cursor has changed
      this.updateOverlay();
    }
  }

  updateOverlay() {
    if (!this.cursorPos) {
      throw new Error("updateOverlay called with no cursor position");
    }
    const $pos = this.editorView.state.doc.resolve(this.cursorPos.pos);
    const isBlock = !$pos.parent.inlineContent;
    let rect;
    const editorDOM = this.editorView.dom;
    const editorRect = editorDOM.getBoundingClientRect();
    const scaleX = editorRect.width / editorDOM.offsetWidth;
    const scaleY = editorRect.height / editorDOM.offsetHeight;
    if (isBlock) {
      const before = $pos.nodeBefore;
      const after = $pos.nodeAfter;
      if (before || after) {
        if (
          this.cursorPos.position === "left" ||
          this.cursorPos.position === "right"
        ) {
          // const blockInfo = getBlockInfoFromPos(
          //   this.editorView.state.doc,
          //   this.cursorPos.pos
          // );

          const block = this.editorView.domAtPos(this.cursorPos.pos).node;
          // console.log("block", block, $pos.nodeBefore, blockInfo);
          //   const blockRect = (block as HTMLElement).getBoundingClientRect();
          //   let position: "regular" | "left" | "right" = "regular";
          //   if (event.clientX <= blockRect.left + blockRect.width * 0.1) {
          //     position = "left";
          //   }
          //   if (event.clientX >= blockRect.right - blockRect.width * 0.1) {
          //     position = "right";
          //   }

          //   const node = this.editorView.nodeDOM(this.cursorPos.pos);
          const blockRect = (block as HTMLElement).getBoundingClientRect();
          const halfWidth = (this.width / 2) * scaleY;
          const left =
            this.cursorPos.position === "left"
              ? blockRect.left
              : blockRect.right;
          rect = {
            left: left - halfWidth,
            right: left + halfWidth,
            top: blockRect.top,
            bottom: blockRect.bottom,
            // left: blockRect.left,
            // right: blockRect.right,
          };
        } else {
          // regular logic
          const node = this.editorView.nodeDOM(
            this.cursorPos.pos - (before ? before.nodeSize : 0)
          );
          if (node) {
            const nodeRect = (node as HTMLElement).getBoundingClientRect();

            let top = before ? nodeRect.bottom : nodeRect.top;
            if (before && after) {
              // find the middle between the node above and below
              top =
                (top +
                  (
                    this.editorView.nodeDOM(this.cursorPos.pos) as HTMLElement
                  ).getBoundingClientRect().top) /
                2;
            }
            //   console.log("node");
            const halfWidth = (this.width / 2) * scaleY;

            if (this.cursorPos.position === "regular") {
              rect = {
                left: nodeRect.left,
                right: nodeRect.right,
                top: top - halfWidth,
                bottom: top + halfWidth,
              };
            }
          }
        }
      }
    }

    if (!rect) {
      // Cursor is an inline vertical dropcursor
      const coords = this.editorView.coordsAtPos(this.cursorPos.pos);
      const halfWidth = (this.width / 2) * scaleX;
      rect = {
        left: coords.left - halfWidth,
        right: coords.left + halfWidth,
        top: coords.top,
        bottom: coords.bottom,
      };
    }

    // Code below positions the cursor overlay based on the rect
    const parent = this.editorView.dom.offsetParent as HTMLElement;
    if (!this.element) {
      this.element = parent.appendChild(document.createElement("div"));
      if (this.class) {
        this.element.className = this.class;
      }
      this.element.style.cssText =
        "position: absolute; z-index: 50; pointer-events: none;";
      if (this.color) {
        this.element.style.backgroundColor = this.color;
      }
    }
    this.element.classList.toggle("prosemirror-dropcursor-block", isBlock);
    this.element.classList.toggle(
      "prosemirror-dropcursor-vertical",
      this.cursorPos.position !== "regular"
    );
    this.element.classList.toggle("prosemirror-dropcursor-inline", !isBlock);
    let parentLeft, parentTop;
    if (
      !parent ||
      (parent === document.body &&
        getComputedStyle(parent).position === "static")
    ) {
      parentLeft = -pageXOffset;
      parentTop = -pageYOffset;
    } else {
      const rect = parent.getBoundingClientRect();
      const parentScaleX = rect.width / parent.offsetWidth;
      const parentScaleY = rect.height / parent.offsetHeight;
      parentLeft = rect.left - parent.scrollLeft * parentScaleX;
      parentTop = rect.top - parent.scrollTop * parentScaleY;
    }
    this.element.style.left = (rect.left - parentLeft) / scaleX + "px";
    this.element.style.top = (rect.top - parentTop) / scaleY + "px";
    this.element.style.width = (rect.right - rect.left) / scaleX + "px";
    this.element.style.height = (rect.bottom - rect.top) / scaleY + "px";
  }

  scheduleRemoval(timeout: number) {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.setCursor(undefined), timeout);
  }

  // this gets executed on every mouse move when dragging (drag over)
  dragover(event: DragEvent) {
    if (!this.editorView.editable) {
      return;
    }
    const pos = this.editorView.posAtCoords({
      left: event.clientX,
      top: event.clientY,
    });

    // console.log("posatcoords", pos);

    const node =
      pos && pos.inside >= 0 && this.editorView.state.doc.nodeAt(pos.inside);
    const disableDropCursor = node && node.type.spec.disableDropCursor;
    const disabled =
      typeof disableDropCursor == "function"
        ? disableDropCursor(this.editorView, pos, event)
        : disableDropCursor;

    if (pos && !disabled) {
      let position: "regular" | "left" | "right" = "regular";
      let target: number | null = pos.pos;

      if (!(event as any).synthetic) {
        let blockInfo = getBlockInfoFromPos(this.editorView.state.doc, pos.pos);
        if (blockInfo.parent()?.type.name === "column") {
          blockInfo = blockInfo.parent()!;
        }
        const block = this.editorView.domAtPos(blockInfo.startPos).node;
        const blockRect = (block as HTMLElement).getBoundingClientRect();

        if (event.clientX <= blockRect.left + blockRect.width * 0.1) {
          position = "left";
          target = blockInfo.startPos;
        }
        if (event.clientX >= blockRect.right - blockRect.width * 0.1) {
          position = "right";
          target = blockInfo.startPos;
        }
      }

      // "regular logic"
      if (
        position === "regular" &&
        this.editorView.dragging &&
        this.editorView.dragging.slice
      ) {
        const point = dropPoint(
          this.editorView.state.doc,
          target,
          this.editorView.dragging.slice
        );

        if (point != null) {
          target = point;
        }
      }
      this.setCursor({ pos: target, position });
      this.scheduleRemoval(5000);
    }
  }

  dragend() {
    this.scheduleRemoval(20);
  }

  drop() {
    this.scheduleRemoval(20);
  }

  dragleave(event: DragEvent) {
    if (
      event.target === this.editorView.dom ||
      !this.editorView.dom.contains((event as any).relatedTarget)
    ) {
      this.setCursor(undefined);
    }
  }
}
