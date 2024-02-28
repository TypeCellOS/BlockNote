import { Block } from "@blocknote/core";
import { BlockNoteView, useCreateBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";
import { useState } from "react";

export default function App() {
  // Stores the selected blocks as an array of Block objects.
  const [blocks, setBlocks] = useState<Block[]>([]);
  // Creates a new editor instance.
  const editor = useCreateBlockNote();

  // Renders the editor instance.
  return (
    <div>
      <BlockNoteView
        editor={editor}
        onSelectionChange={() => {
          const selection = editor.getSelection();

          // Get the blocks in the current selection and store on the state. If
          // the selection is empty, store the block containing the text cursor
          // instead.
          if (selection !== undefined) {
            setBlocks(selection.blocks);
          } else {
            setBlocks([editor.getTextCursorPosition().block]);
          }
        }}
      />
      <p>Selection JSON:</p>
      <pre>{JSON.stringify(blocks, null, 2)}</pre>
    </div>
  );
}
