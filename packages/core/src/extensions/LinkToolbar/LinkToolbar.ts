import { getMarkRange, posToDOMRect } from "@tiptap/core";
import { createExtension } from "../../editor/BlockNoteExtension.js";
import { getPmSchema } from "../../api/pmUtil.js";

export const LinkToolbarPlugin = createExtension((editor) => {
  return {
    key: "linkToolbar",

    getLinkElementAtPos(pos: number) {
      let currentNode = editor.prosemirrorView.nodeDOM(pos);
      while (currentNode && currentNode.parentElement) {
        if (currentNode.nodeName === "A") {
          return currentNode as HTMLAnchorElement;
        }
        currentNode = currentNode.parentElement;
      }
      return null;
    },

    getLinkAtElement(element: HTMLElement) {
      return editor.transact(() => {
        const posAtElement = editor.prosemirrorView.posAtDOM(element, 0) + 1;
        return this.getMarkAtPos(posAtElement, "link");
      });
    },

    getLinkAtSelection() {
      return editor.transact((tr) => {
        const selection = tr.selection;
        return this.getMarkAtPos(selection.anchor, "link");
      });
    },

    getMarkAtPos(pos: number, markType: string) {
      return editor.transact((tr) => {
        const resolvedPos = tr.doc.resolve(pos);
        const mark = resolvedPos
          .marks()
          .find((mark) => mark.type.name === markType);

        if (!mark) {
          return;
        }

        const markRange = getMarkRange(resolvedPos, mark.type);
        if (!markRange) {
          return;
        }

        return {
          range: markRange,
          mark,
          get text() {
            return tr.doc.textBetween(markRange.from, markRange.to);
          },
          get position() {
            // to minimize re-renders, we convert to JSON, which is the same shape anyway
            return posToDOMRect(
              editor.prosemirrorView,
              markRange.from,
              markRange.to,
            ).toJSON() as DOMRect;
          },
        };
      });
    },

    editLink(url: string, text: string) {
      editor.transact((tr) => {
        const pmSchema = getPmSchema(tr);
        const range = this.getLinkAtSelection()?.range;
        if (!range) {
          return;
        }
        tr.insertText(text, range.from, range.to);
        tr.addMark(
          range.from,
          range.from + text.length,
          pmSchema.mark("link", { href: url }),
        );
      });
      editor.prosemirrorView.focus();
    },

    deleteLink() {
      editor.transact((tr) => {
        const pmSchema = getPmSchema(tr);
        const range = this.getLinkAtSelection()?.range;
        if (!range) {
          return;
        }

        tr.removeMark(range.from, range.to, pmSchema.mark("link")).setMeta(
          "preventAutolink",
          true,
        );
      });
      editor.prosemirrorView.focus();
    },
  } as const;
});
