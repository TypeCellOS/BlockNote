import { Editor, isNodeSelection, posToDOMRect } from "@tiptap/core";
import { BubbleMenuProps } from "./types";

export function getBubbleMenuProps(editor: Editor): BubbleMenuProps {
  return {
    marks: {
      bold: {
        isActive: editor.isActive("bold"),
        toggle: () => {
          editor.view.focus();
          editor.commands.toggleBold();
        },
      },
      italic: {
        isActive: editor.isActive("italic"),
        toggle: () => {
          editor.view.focus();
          editor.commands.toggleItalic();
        },
      },
      underline: {
        isActive: editor.isActive("underline"),
        toggle: () => {
          editor.view.focus();
          editor.commands.toggleUnderline();
        },
      },
      strike: {
        isActive: editor.isActive("strike"),
        toggle: () => {
          editor.view.focus();
          editor.commands.toggleStrike();
        },
      },
      hyperlink: {
        isActive: editor.isActive("link"),
        url: editor.getAttributes("link").href,
        text: editor.state.doc.textBetween(
          editor.state.selection.from,
          editor.state.selection.to
        ),
        set: (url: string, text?: string) => {
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
      },
    },
    blocks: {
      paragraph: {
        isActive:
          editor.state.selection.$from.node().type.name === "textContent",
        set: () => {
          editor.view.focus();
          editor.commands.BNSetContentType(
            editor.state.selection.from,
            "textContent"
          );
        },
      },
      heading: {
        isActive:
          editor.state.selection.$from.node().type.name === "headingContent",
        level: editor.state.selection.$from.node().attrs["headingLevel"],
        set: (level: string = "1") => {
          editor.view.focus();
          editor.commands.BNSetContentType(
            editor.state.selection.from,
            "headingContent",
            {
              headingLevel: level,
            }
          );
        },
      },
      listItem: {
        isActive:
          editor.state.selection.$from.node().type.name === "listItemContent",
        type: editor.state.selection.$from.node().attrs["listItemType"],
        set: (type: string = "unordered") => {
          editor.view.focus();
          editor.commands.BNSetContentType(
            editor.state.selection.from,
            "listItemContent",
            {
              listItemType: type,
            }
          );
        },
      },
    },
    view: {
      // TODO: Define function in plugin instead and pass it as an argument?
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
      getEditorElement: () => editor.options.element,
    },
  };
}
