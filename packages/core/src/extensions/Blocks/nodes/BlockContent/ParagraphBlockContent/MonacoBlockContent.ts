import { mergeAttributes } from "@tiptap/core";
import * as monaco from "monaco-editor";
import { createTipTapBlock } from "../../../api/block";
import styles from "../../Block.module.css";

// @ts-ignore
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker"; // eslint-disable-line import/no-webpack-loader-syntax
// @ts-ignore
import TsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker"; // eslint-disable-line import/no-webpack-loader-syntax
// @ts-ignore
import { Node } from "@tiptap/pm/model";
import { Selection, TextSelection, Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSource, EditorView } from "@tiptap/pm/view";
import CSSWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";

import { keymap } from "prosemirror-keymap";

function arrowHandler(dir: string) {
  return (state: any, dispatch: any, view: any) => {
    if (state.selection.empty && view.endOfTextblock(dir)) {
      let side = dir == "left" || dir == "up" ? -1 : 1;
      let $head = state.selection.$head;
      let nextPos = Selection.near(
        state.doc.resolve(side > 0 ? $head.after() : $head.before()),
        side
      );
      if (nextPos.$head && nextPos.$head.parent.type.name == "monaco") {
        dispatch(state.tr.setSelection(nextPos));
        return true;
      }
    }
    return false;
  };
}

const arrowHandlers = keymap({
  ArrowLeft: arrowHandler("left"),
  ArrowRight: arrowHandler("right"),
  ArrowUp: arrowHandler("up"),
  ArrowDown: arrowHandler("down"),
});

export function selectionDir(
  view: EditorView,
  pos: number,
  size: number,
  dir: -1 | 1
) {
  const targetPos = pos + (dir < 0 ? 0 : size);
  const selection = Selection.near(view.state.doc.resolve(targetPos), dir);
  view.dispatch(view.state.tr.setSelection(selection).scrollIntoView());
  // view.focus();
}

if (!(window as any).MonacoEnvironment) {
  (window as any).MonacoEnvironment = (globalThis as any).MonacoEnvironment = {
    getWorker: function (workerId: string, label: string) {
      if (label === "typescript" || label === "javascript") {
        return new TsWorker();
      }
      if (label === "json") {
        throw new Error("not implemented");
      }
      if (label === "css" || label === "scss" || label === "less") {
        return new CSSWorker();
      }
      if (label === "html" || label === "handlebars" || label === "razor") {
        throw new Error("not implemented");
      }
      return new EditorWorker();
    },
  };
}

function getTransactionForSelectionUpdate(
  selection: monaco.Selection | null,
  model: monaco.editor.ITextModel | null,
  offset: number,
  tr: Transaction
) {
  if (selection && model) {
    const selFrom = model!.getOffsetAt(selection.getStartPosition()) + offset;
    const selEnd = model!.getOffsetAt(selection.getEndPosition()) + offset;
    tr.setSelection(
      TextSelection.create(
        tr.doc,
        selection.getDirection() === monaco.SelectionDirection.LTR
          ? selFrom
          : selEnd,
        selection.getDirection() === monaco.SelectionDirection.LTR
          ? selEnd
          : selFrom
      )
    );
  }
}

// TODO: clean up listeners
export const MonacoBlockContent = createTipTapBlock({
  name: "monaco",
  content: "inline*",
  editable: true,
  parseHTML() {
    return [
      {
        tag: "p",
        priority: 200,
        node: "paragraph",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "code",
      mergeAttributes(HTMLAttributes, {
        class: styles.blockContent,
        "data-content-type": this.name,
      }),
      ["p", 0],
    ];
  },

  addNodeView() {
    let theNode: Node;
    let updating = false;
    // @ts-ignore
    return ({
      editor,
      node,
      getPos,
      HTMLAttributes,
      decorations,
      extension,
    }) => {
      console.log("new monaco", decorations);
      theNode = node;
      const dom = document.createElement("div");
      dom.style.height = "500px";
      const mon = monaco.editor.create(dom, {
        value: node.textContent,
        language: "javascript",
      });
      mon.layout({ width: 500, height: 500 });
      // dom.innerHTML = "Hello, I’m a node view!";

      mon.onDidChangeCursorSelection((e) => {
        console.log("change selection");

        if (typeof getPos === "boolean") {
          throw new Error("getPos is boolean");
        }

        if (updating) {
          return;
        }

        let offset = getPos() + 1;

        let tr = editor.view.state.tr;
        getTransactionForSelectionUpdate(
          mon.getSelection(),
          mon.getModel(),
          offset,
          tr
        );
        try {
          editor.view.dispatch(tr);
        } catch (e) {
          console.error(e);
        }
      });

      // mon.onDidChangeCursorPosition((e) => {
      //   console.log("change position");
      // });

      mon.onDidChangeModelContent((e) => {
        if (typeof getPos === "boolean") {
          throw new Error("getPos is boolean");
        }

        if (updating) {
          return;
        }
        let offset = getPos() + 1;
        // { main } = update.state.selection;

        let tr = editor.view.state.tr;

        e.changes.forEach((change) => {
          if (change.text.length) {
            tr.replaceWith(
              offset + change.rangeOffset,
              offset + change.rangeOffset + change.rangeLength,
              editor.view.state.schema.text(change.text.toString())
            );
          } else {
            tr.delete(
              offset + change.rangeOffset,
              offset + change.rangeOffset + change.rangeLength
            );
          }
          // TODO: update offset?
        });
        getTransactionForSelectionUpdate(
          mon.getSelection(),
          mon.getModel(),
          offset,
          tr
        );
        try {
          editor.view.dispatch(tr);

          setTimeout(() => mon.focus(), 1000);
          console.log(mon);
        } catch (e) {
          console.error(e);
        }
      });

      mon.onKeyDown((e) => {
        if (typeof getPos === "boolean") {
          throw new Error("getPos is boolean");
        }
        // const { node, view, getPos } = propsRef.current;
        // 删除
        // if (e.code === "Delete" || e.code === "Backspace") {
        //   if (node.textContent === "") {
        //     view.dispatch(
        //       view.state.tr.deleteRange(getPos(), getPos() + node.nodeSize)
        //     );
        //     view.focus();
        //     return;
        //   }
        // }
        // // 移动光标
        const { lineNumber = 1, column = 1 } = mon.getPosition() || {};
        const model = mon.getModel();
        const maxLines = model?.getLineCount() || 1;
        let dir: -1 | 1 | null = null;
        if (e.code === "ArrowLeft") {
          if (lineNumber !== 1 || column !== 1) {
            return;
          }
          dir = -1;
        } else if (e.code === "ArrowRight") {
          if (
            lineNumber !== maxLines ||
            column - 1 !== model?.getLineLength(maxLines)
          ) {
            return;
          }
          dir = 1;
        } else if (e.code === "ArrowUp") {
          if (lineNumber !== 1) {
            return;
          }
          dir = -1;
        } else if (e.code === "ArrowDown") {
          if (lineNumber !== maxLines) {
            return;
          }
          dir = 1;
        }
        if (dir !== null) {
          console.log("dir", dir, theNode.nodeSize);
          selectionDir(editor.view, getPos(), theNode.nodeSize, dir);
          return;
        }
      });
      let lastDecorations: string[] = [];
      return {
        dom,

        update(node, decorations, innerDecorations: DecorationSource) {
          console.log("update incoming", decorations, innerDecorations);
          if (node.type !== theNode.type) {
            return false;
          }
          theNode = node;
          const modal = mon.getModel();
          if (!modal) {
            console.error("no modal");
            return;
          }

          let newText = node.textContent;
          let curText = modal.getValue();
          if (newText !== curText) {
            let start = 0,
              curEnd = curText.length,
              newEnd = newText.length;
            while (
              start < curEnd &&
              curText.charCodeAt(start) === newText.charCodeAt(start)
            ) {
              ++start;
            }
            while (
              curEnd > start &&
              newEnd > start &&
              curText.charCodeAt(curEnd - 1) == newText.charCodeAt(newEnd - 1)
            ) {
              curEnd--;
              newEnd--;
            }

            updating = true;
            modal.applyEdits([
              {
                range: monaco.Range.fromPositions(
                  modal.getPositionAt(start),
                  modal.getPositionAt(curEnd)
                ),
                text: newText.slice(start, newEnd),
              },
            ]);
          }

          const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];
          const decs = (innerDecorations as any).local as Decoration[];

          decs
            .filter((d) => d.spec.type === "cursor")
            .forEach((cursorDec) => {
              const selectionDec = decs.find(
                (d) =>
                  d.spec.type === "selection" &&
                  d.spec.clientID === cursorDec.spec.clientID
              );

              let start: monaco.Position;
              let end: monaco.Position;
              let afterContentClassName: string | undefined;
              let beforeContentClassName: string | undefined;

              const to = cursorDec.to;
              const from = selectionDec
                ? selectionDec.from === to
                  ? selectionDec.to
                  : selectionDec.from
                : to;

              if (from < to) {
                start = modal.getPositionAt(from);
                end = modal.getPositionAt(to);
                afterContentClassName =
                  "yRemoteSelectionHead yRemoteSelectionHead-" +
                  cursorDec.spec.clientID;
              } else {
                start = modal.getPositionAt(to);
                end = modal.getPositionAt(from);
                beforeContentClassName =
                  "yRemoteSelectionHead yRemoteSelectionHead-" +
                  cursorDec.spec.clientID;
              }
              newDecorations.push({
                range: new monaco.Range(
                  start.lineNumber,
                  start.column,
                  end.lineNumber,
                  end.column
                ),
                options: {
                  className:
                    "yRemoteSelection yRemoteSelection-" +
                    cursorDec.spec.clientID,
                  afterContentClassName,
                  beforeContentClassName,
                },
              });
            });
          // TODO: take widget decoration as base

          /*decs.forEach((deco) => {
            if (
              (deco as any).type?.attrs?.class !== "ProseMirror-yjs-selection"
            ) {
              return;
            }
            let start: monaco.Position;
            let end: monaco.Position;
            let afterContentClassName: string | undefined;
            let beforeContentClassName: string | undefined;
            const clientID = "sdfdsf";

            if (deco.from < deco.to) {
              start = modal.getPositionAt(deco.from);
              end = modal.getPositionAt(deco.to);
              afterContentClassName =
                "yRemoteSelectionHead yRemoteSelectionHead-" + clientID;
            } else {
              start = modal.getPositionAt(deco.to);
              end = modal.getPositionAt(deco.from);
              beforeContentClassName =
                "yRemoteSelectionHead yRemoteSelectionHead-" + clientID;
            }
            newDecorations.push({
              range: new monaco.Range(
                start.lineNumber,
                start.column,
                end.lineNumber,
                end.column
              ),
              options: {
                className: "yRemoteSelection yRemoteSelection-" + clientID,
                afterContentClassName,
                beforeContentClassName,
              },
            });
            console.log("range", {
              range: new monaco.Range(
                start.lineNumber,
                start.column,
                end.lineNumber,
                end.column
              ),
            });
            // debugger;
          });*/

          lastDecorations = mon.deltaDecorations(
            lastDecorations,
            newDecorations
          );
          // const collection = mon.createDecorationsCollection(newDecorations);
          // TODO: update / clear decorations?
          // console.log(collection);
          // mon.deltaDecorations
          updating = false;

          /*
          const anchorAbs = Y.createAbsolutePositionFromRelativePosition(state.selection.anchor, this.doc)
          const headAbs = Y.createAbsolutePositionFromRelativePosition(state.selection.head, this.doc)
          if (anchorAbs !== null && headAbs !== null && anchorAbs.type === ytext && headAbs.type === ytext) {
            let start, end, afterContentClassName, beforeContentClassName
            if (anchorAbs.index < headAbs.index) {
              start = monacoModel.getPositionAt(anchorAbs.index)
              end = monacoModel.getPositionAt(headAbs.index)
              afterContentClassName = 'yRemoteSelectionHead yRemoteSelectionHead-' + clientID
              beforeContentClassName = null
            } else {
              start = monacoModel.getPositionAt(headAbs.index)
              end = monacoModel.getPositionAt(anchorAbs.index)
              afterContentClassName = null
              beforeContentClassName = 'yRemoteSelectionHead yRemoteSelectionHead-' + clientID
            }
            newDecorations.push({
              range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
              options: {
                className: 'yRemoteSelection yRemoteSelection-' + clientID,
                afterContentClassName,
                beforeContentClassName
              }
            })
*/

          return true;
        },
        deselectNode() {
          console.error("deselectNode not implemented");
        },
        selectNode() {
          console.log("selectNode");
          mon.focus();
        },
        stopEvent() {
          return true;
        },
        setSelection(anchor: number, head: number, root) {
          console.log("setSelection", anchor, head, root);
          const model = mon.getModel();
          if (!model) {
            return;
          }

          mon.focus();

          let startPos = model.getPositionAt(anchor);
          let endPos = model.getPositionAt(head);
          updating = true;
          mon.setSelection(monaco.Selection.fromPositions(startPos, endPos));
          updating = false;
        },
      };
    };
  },
  addProseMirrorPlugins() {
    return [arrowHandlers];
  },
});
