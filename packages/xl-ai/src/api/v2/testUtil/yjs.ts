import { BlockNoteEditor, type BlockNoteEditorOptions } from "@blocknote/core";
import { withCollaboration } from "@blocknote/core/yjs";
import type * as Y from "yjs";

import { getDocumentText } from "../api.js";
import type { TextFormat } from "../formats/types.js";

/**
 * An editor that is bound to the fragment and mounted, as `updateYDocFromText`
 * needs it. Each call gives a new client of the Y.Doc.
 */
export function bindEditor(
  fragment: Y.XmlFragment,
  options: Partial<BlockNoteEditorOptions<any, any, any>> = {},
): BlockNoteEditor<any, any, any> {
  const editor = BlockNoteEditor.create(
    withCollaboration({
      ...options,
      collaboration: { fragment, user: { name: "Lens", color: "#000000" } },
    }),
  );
  editor.mount(document.createElement("div"));
  return editor;
}

/** The text of the Y.Doc, as a new client reads it. */
export function readText(
  fragment: Y.XmlFragment,
  format: TextFormat,
  options: Partial<BlockNoteEditorOptions<any, any, any>> = {},
): string {
  const editor = bindEditor(fragment, options);
  const text = getDocumentText(editor, format);
  editor._tiptapEditor.destroy();
  return text;
}
