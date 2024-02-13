import {
  Block,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
} from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";
import { useState } from "react";

export default function App() {
  // Stores the editor's contents as an array of Block objects.
  const [blocks, setBlocks] = useState<
    Block<DefaultBlockSchema, DefaultInlineContentSchema, DefaultStyleSchema>[]
  >([]);
  // Creates a new editor instance.
  const editor = useBlockNote({});

  // Renders the editor instance and its contents, as an array of Block
  // objects, below.
  return (
    <div>
      <BlockNoteView
        editor={editor}
        onChange={() => {
          // Converts the editor's contents to an array of Block objects.
          setBlocks(editor.topLevelBlocks);
        }}
      />
      <p>Document JSON:</p>
      <pre>{JSON.stringify(blocks, null, 2)}</pre>
    </div>
  );
}
