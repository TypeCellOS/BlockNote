import type { BlockNoteEditor } from "@blocknote/core";
import { captureEditorClipboard } from "../../../utils/clipboardEvent.js";

export function copyToClipboard(editor: Pick<BlockNoteEditor, "domElement">) {
  const clipboard = captureEditorClipboard(editor);

  function readPayload(type: string) {
    if (!clipboard.types.includes(type)) {
      throw new Error(`Copy did not write ${type}`);
    }
    return clipboard.getData(type);
  }

  return {
    clipboardHTML: readPayload("blocknote/html"),
    externalHTML: readPayload("text/html"),
    markdown: readPayload("text/plain"),
  };
}
