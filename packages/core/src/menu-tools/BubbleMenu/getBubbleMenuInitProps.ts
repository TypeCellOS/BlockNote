import { Editor, isNodeSelection, posToDOMRect } from "@tiptap/core";
import { BubbleMenuInitProps } from "./types";

export function getBubbleMenuInitProps(editor: Editor): BubbleMenuInitProps {
  return {
    toggleBold: () => {
      // Setting editor focus using a chained command instead causes bubble menu to flicker on click.
      editor.view.focus();
      editor.commands.toggleBold();
    },
    toggleItalic: () => {
      editor.view.focus();
      editor.commands.toggleItalic();
    },
    toggleUnderline: () => {
      editor.view.focus();
      editor.commands.toggleUnderline();
    },
    toggleStrike: () => {
      editor.view.focus();
      editor.commands.toggleStrike();
    },
    setHyperlink: (url: string, text?: string) => {
      if (url === "") {
        return;
      }

      let { from, to } = editor.state.selection;

      if (!text) {
        text = editor.state.doc.textBetween(from, to);
      }

      const mark = editor.schema.mark("link", { href: url });

      editor.view.dispatch(
        editor.view.state.tr
          .insertText(text, from, to)
          .addMark(from, from + text.length, mark)
      );
    },
    setParagraph: () => {
      editor.view.focus();
      editor.commands.BNSetContentType(
        editor.state.selection.from,
        "textContent"
      );
    },
    setHeading: (level: string = "1") => {
      editor.view.focus();
      editor.commands.BNSetContentType(
        editor.state.selection.from,
        "headingContent",
        {
          headingLevel: level,
        }
      );
    },
    setListItem: (type: string = "unordered") => {
      editor.view.focus();
      editor.commands.BNSetContentType(
        editor.state.selection.from,
        "listItemContent",
        {
          listItemType: type,
        }
      );
    },
    // TODO: Menu currently needs to delay getting the bounding box, as the editor, and its corresponding view, are
    //  passed in when an animation starts. This means that the DOMRect found will be incorrect, as the selection
    //  bounding box used to create it is from an editor view that is out of date due to the animation.
    getSelectionBoundingBox: () => {
      const { state } = editor.view;
      const { selection } = state;

      // support for CellSelections
      const { ranges } = selection;
      const from = Math.min(...ranges.map((range) => range.$from.pos));
      const to = Math.max(...ranges.map((range) => range.$to.pos));

      if (isNodeSelection(selection)) {
        const node = editor.view.nodeDOM(from) as HTMLElement;

        if (node) {
          return node.getBoundingClientRect();
        }
      }

      return posToDOMRect(editor.view, from, to);
    },
    editorElement: editor.options.element,
  };
}
