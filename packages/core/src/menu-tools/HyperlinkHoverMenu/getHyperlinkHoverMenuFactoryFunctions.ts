import { Editor, getMarkRange, posToDOMRect, Range } from "@tiptap/core";
import { HyperlinkHoverMenuFactoryFunctions } from "./types";
import { Mark } from "prosemirror-model";

let mouseHoveredHyperlinkMark: Mark | undefined;
let mouseHoveredHyperlinkMarkRange: Range | undefined;

let keyboardHoveredHyperlinkMark: Mark | undefined;
let keyboardHoveredHyperlinkMarkRange: Range | undefined;

let hyperlinkMark: Mark | undefined;
let hyperlinkMarkRange: Range | undefined;

function getHyperlinkMark(editor: Editor) {
  if (editor.state.selection.empty) {
    const marksAtPos = editor.state.selection.$from.marks();

    let foundHyperlinkMark = false;

    for (const mark of marksAtPos) {
      if (mark.type.name === editor.schema.mark("link").type.name) {
        keyboardHoveredHyperlinkMark = mark;
        keyboardHoveredHyperlinkMarkRange =
          getMarkRange(editor.state.selection.$from, mark.type, mark.attrs) ||
          undefined;
        foundHyperlinkMark = true;

        break;
      }
    }

    if (!foundHyperlinkMark) {
      keyboardHoveredHyperlinkMark = undefined;
      keyboardHoveredHyperlinkMarkRange = undefined;
    }
  }

  if (keyboardHoveredHyperlinkMark) {
    hyperlinkMark = keyboardHoveredHyperlinkMark;
    hyperlinkMarkRange = keyboardHoveredHyperlinkMarkRange;
  }

  // console.log(mouseHoveredHyperlinkMark);
  if (mouseHoveredHyperlinkMark) {
    hyperlinkMark = mouseHoveredHyperlinkMark;
    hyperlinkMarkRange = mouseHoveredHyperlinkMarkRange;
  }

  if (!mouseHoveredHyperlinkMark && !keyboardHoveredHyperlinkMark) {
    hyperlinkMark = undefined;
    hyperlinkMarkRange = undefined;
  }

  return {
    hyperlinkMark,
    hyperlinkMarkRange,
  };
}

export function getHyperlinkHoverMenuFactoryFunctions(
  editor: Editor
): HyperlinkHoverMenuFactoryFunctions {
  const editorElement = editor.options.element;
  editorElement.addEventListener("mouseover", (event) => {
    if (
      event.target instanceof HTMLAnchorElement &&
      event.target.nodeName === "A"
    ) {
      const hoveredHyperlinkElement = event.target;
      const posInHoveredHyperlinkMark =
        editor.view.posAtDOM(hoveredHyperlinkElement, 0) + 1;
      const resolvedPosInHoveredHyperlinkMark = editor.state.doc.resolve(
        posInHoveredHyperlinkMark
      );
      const marksAtPos = resolvedPosInHoveredHyperlinkMark.marks();

      let foundHyperlinkMark = false;

      for (const mark of marksAtPos) {
        if (mark.type.name === editor.schema.mark("link").type.name) {
          mouseHoveredHyperlinkMark = mark;
          mouseHoveredHyperlinkMarkRange =
            getMarkRange(
              resolvedPosInHoveredHyperlinkMark,
              mark.type,
              mark.attrs
            ) || undefined;
          foundHyperlinkMark = true;

          break;
        }
      }

      if (!foundHyperlinkMark) {
        mouseHoveredHyperlinkMark = undefined;
        mouseHoveredHyperlinkMarkRange = undefined;
      }
    } else {
      mouseHoveredHyperlinkMark = undefined;
      mouseHoveredHyperlinkMarkRange = undefined;
    }
  });

  return {
    hyperlink: {
      getUrl: () => {
        const { hyperlinkMark } = getHyperlinkMark(editor);
        return hyperlinkMark?.attrs.href;
      },
      getText: () => {
        const { hyperlinkMarkRange } = getHyperlinkMark(editor);

        if (!hyperlinkMarkRange) {
          return "";
        }

        return editor.view.state.doc.textBetween(
          hyperlinkMarkRange.from,
          hyperlinkMarkRange.to
        );
      },
      edit: (url: string, text: string) => {
        const { hyperlinkMarkRange } = getHyperlinkMark(editor);

        if (!hyperlinkMarkRange) {
          return;
        }

        const tr = editor.view.state.tr.insertText(
          text,
          hyperlinkMarkRange.from,
          hyperlinkMarkRange.to
        );
        tr.addMark(
          hyperlinkMarkRange.from,
          hyperlinkMarkRange.from + text.length,
          editor.schema.mark("link", { href: url })
        );
        editor.view.dispatch(tr);
      },
      delete: () => {
        const { hyperlinkMark, hyperlinkMarkRange } = getHyperlinkMark(editor);

        if (!hyperlinkMark || !hyperlinkMarkRange) {
          return;
        }

        editor.view.dispatch(
          editor.view.state.tr
            .removeMark(
              hyperlinkMarkRange.from,
              hyperlinkMarkRange.to,
              hyperlinkMark.type
            )
            .setMeta("preventAutolink", true)
        );
      },
    },
    view: {
      getHyperlinkBoundingBox: () => {
        const { hyperlinkMarkRange } = getHyperlinkMark(editor);

        if (!hyperlinkMarkRange) {
          return;
        }

        return posToDOMRect(
          editor.view,
          hyperlinkMarkRange.from,
          hyperlinkMarkRange.to
        );
      },
    },
  };
}
