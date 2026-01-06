import { getMarkRange, posToDOMRect } from "@tiptap/core";
import { getPmSchema } from "../../api/pmUtil.js";
import { createExtension } from "../../editor/BlockNoteExtension.js";

export const LinkToolbarExtension = createExtension(({ editor }) => {
  function getLinkElementAtPos(pos: number) {
    let currentNode = editor.prosemirrorView.nodeDOM(pos);
    while (currentNode && currentNode.parentElement) {
      if (currentNode.nodeName === "A") {
        return currentNode as HTMLAnchorElement;
      }
      currentNode = currentNode.parentElement;
    }
    return null;
  }

  function getMarkAtPos(pos: number, markType: string) {
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
  }

  function getLinkAtSelection() {
    return editor.transact((tr) => {
      const selection = tr.selection;
      if (!selection.empty) {
        return undefined;
      }
      return getMarkAtPos(selection.anchor, "link");
    });
  }

  return {
    key: "linkToolbar",

    getLinkAtSelection,
    getLinkElementAtPos,
    getMarkAtPos,

    getLinkAtElement(element: HTMLElement) {
      return editor.transact(() => {
        // Q4: posAtDOM can fail if the editor view is not available
        //     (e.g. if the editor is not mounted)
        //     a) Unfortunately, TS doesn't give an error about this. Can we make this type safe?
        //     b) Double check other references of editor.prosemirrorView

        const posAtElement = editor.prosemirrorView.posAtDOM(element, 0) + 1;
        return getMarkAtPos(posAtElement, "link");
      });
    },

    editLink(
      url: string,
      text: string,
      position = editor.transact((tr) => tr.selection.anchor),
    ) {
      editor.transact((tr) => {
        const pmSchema = getPmSchema(tr);
        const { range } = getMarkAtPos(position + 1, "link") || {
          range: {
            from: tr.selection.from,
            to: tr.selection.to,
          },
        };
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
    deleteLink(position = editor.transact((tr) => tr.selection.anchor)) {
      editor.transact((tr) => {
        const pmSchema = getPmSchema(tr);
        const { range } = getMarkAtPos(position + 1, "link") || {
          range: {
            from: tr.selection.from,
            to: tr.selection.to,
          },
        };
        if (!range) {
          return;
        }

        tr.removeMark(range.from, range.to, pmSchema.marks["link"]).setMeta(
          "preventAutolink",
          true,
        );
      });
      editor.prosemirrorView.focus();
    },
  } as const;
});
