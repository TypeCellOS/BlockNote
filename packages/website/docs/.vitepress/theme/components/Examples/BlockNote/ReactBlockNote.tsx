import "@blocknote/core/style.css";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import * as styles from "./ReactBlockNote.module.css";

export function ReactBlockNote() {
  const editor = useBlockNote({
    onUpdate: (editor) => {
      // Log the document to console on every update
      console.log(editor.topLevelBlocks);
    },
    editorDOMAttributes: {
      class: styles.editor,
    },
  });

  return <BlockNoteView editor={editor} />;
}
