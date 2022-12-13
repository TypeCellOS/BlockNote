import { Editor } from "@tiptap/core";

// Maybe useful later to not have to pass entire editor instance to menu factories?
export type BubbleMenuFunctionTypes = {
  styles: {
    boldActive: () => boolean;
    toggleBold: () => void;

    italicActive: () => boolean;
    toggleItalic: () => void;

    underlineActive: () => boolean;
    toggleUnderline: () => void;

    strikeActive: () => boolean;
    toggleStrike: () => void;

    hyperlinkActive: () => boolean;
    hyperlinkUrl: () => string;
    hyperlinkText: () => string;
    addHyperlink: (url: string, text?: string) => void;
    removeHyperlink: () => void;
  };
  blockTypes: {
    paragraphActive: () => boolean;
    setParagraph: () => void;

    headingActive: () => boolean;
    headingLevel: () => string;
    setHeading: (level: string) => void;

    listItemActive: () => boolean;
    listItemType: () => string;
    setListItem: (type: string) => void;
  };
};

export function getBubbleMenuFunctions(
  editor: Editor
): BubbleMenuFunctionTypes {
  return {
    styles: {
      boldActive: () => editor.isActive("bold"),
      toggleBold: () => {
        editor.view.focus();
        editor.commands.toggleBold();
      },
      italicActive: () => editor.isActive("italic"),
      toggleItalic: () => {
        editor.view.focus();
        editor.commands.toggleItalic();
      },
      underlineActive: () => editor.isActive("underline"),
      toggleUnderline: () => {
        editor.view.focus();
        editor.commands.toggleUnderline();
      },
      strikeActive: () => editor.isActive("strike"),
      toggleStrike: () => {
        editor.view.focus();
        editor.commands.toggleStrike();
      },
      hyperlinkActive: () => editor.isActive("link"),
      hyperlinkUrl: () => editor.getAttributes("link").href,
      hyperlinkText: () => {
        const { from, to } = editor.state.selection;

        return editor.state.doc.textBetween(from, to);
      },
      addHyperlink: (url: string, text?: string) => {
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
    blockTypes: {
      paragraphActive: () =>
        editor.state.selection.$from.node().type.name === "textContent",
      setParagraph: () => {
        editor.view.focus();
        editor.commands.BNSetContentType(
          editor.state.selection.from,
          "textContent"
        );
      },
      headingActive: () =>
        editor.state.selection.$from.node().type.name === "headingContent",
      headingLevel: () =>
        editor.state.selection.$from.node().attrs["headingLevel"],
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
      listItemActive: () =>
        editor.state.selection.$from.node().type.name === "listItemContent",
      listItemType: () =>
        editor.state.selection.$from.node().attrs["listItemType"],
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
    },
  };
}
