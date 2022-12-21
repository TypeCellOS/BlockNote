import { Editor } from "@tiptap/core";
import { BubbleMenuUpdateProps } from "./types";

export function getBubbleMenuUpdateProps(
  editor: Editor
): BubbleMenuUpdateProps {
  return {
    boldIsActive: editor.isActive("bold"),
    italicIsActive: editor.isActive("italic"),
    underlineIsActive: editor.isActive("underline"),
    strikeIsActive: editor.isActive("strike"),
    hyperlinkIsActive: editor.isActive("link"),
    activeHyperlinkUrl: editor.getAttributes("link").href,
    activeHyperlinkText: editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to
    ),
    paragraphIsActive:
      editor.state.selection.$from.node().type.name === "textContent",
    headingIsActive:
      editor.state.selection.$from.node().type.name === "headingContent",
    activeHeadingLevel:
      editor.state.selection.$from.node().attrs["headingLevel"],
    listItemIsActive:
      editor.state.selection.$from.node().type.name === "listItemContent",
    activeListItemType:
      editor.state.selection.$from.node().attrs["listItemType"],
  };
}
