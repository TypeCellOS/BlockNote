import { Editor } from "@tiptap/core";
import { getBlockInfoFromPos } from "./getBlockInfoFromPos";

// Used to get the content type of the block that the text cursor is in. This is
// a band-aid fix to prevent input rules and keyboard shortcuts from triggering
// in tables, but really those should be extended to work with block selections.
export const getCurrentBlockContentType = (editor: Editor) => {
  const { contentType } = getBlockInfoFromPos(
    editor.state.doc,
    editor.state.selection.from
  );

  return contentType.spec.content;
};
