import {
  Block,
  BlockNoteEditor,
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

  // TODO: revise API to use a simple hook?

  // Creates a new editor instance.
  const editor: BlockNoteEditor = useBlockNote({
    // Listens for when the editor's contents change.
    onEditorContentChange: (editor) =>
      // Converts the editor's contents to an array of Block objects.
      setBlocks(editor.topLevelBlocks),
  });

  // Renders the editor instance and its contents, as an array of Block
  // objects, below.
  return (
    <div>
      <BlockNoteView editor={editor} />
      <p>Document JSON:</p>
      <pre>{JSON.stringify(blocks, null, 2)}</pre>
    </div>
  );
}
