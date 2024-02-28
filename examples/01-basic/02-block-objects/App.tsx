import { Block } from "@blocknote/core";
import { BlockNoteView, useCreateBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";
import { useState } from "react";

export default function App() {
  // Stores the editor's contents (document) as an array of Block objects.
  const [blocks, setBlocks] = useState<Block[]>([]);
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
      },
      {
        type: "heading",
        content: "This is a heading block",
      },
      {
        type: "paragraph",
        content: "This is a paragraph block",
      },
      {
        type: "paragraph",
      },
    ],
  });

  // Renders the editor instance and its contents, as an array of Block
  // objects, below.
  return (
    <div>
      <BlockNoteView
        editor={editor}
        onChange={() => {
          // Get the editor content (document) and store on the state.
          setBlocks(editor.document);
        }}
      />
      <p>Document JSON:</p>
      <pre>{JSON.stringify(blocks, null, 2)}</pre>
    </div>
  );
}
