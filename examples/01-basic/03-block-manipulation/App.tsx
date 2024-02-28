import { BlockNoteView, useCreateBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

export default function App() {
  const editor = useCreateBlockNote();

  return (
    <div>
      <BlockNoteView editor={editor} />
      {/*Inserts a new block at end of document.*/}
      <button
        onClick={() =>
          editor.insertBlocks(
            [
              {
                content:
                  "This block was inserted at " +
                  new Date().toLocaleTimeString(),
              },
            ],
            editor.document[editor.document.length - 1],
            "after"
          )
        }>
        Add block
      </button>
      {/*Updates the currently selected block*/}
      <button
        onClick={() =>
          editor.updateBlock(editor.document[0], {
            content:
              "This block was updated at " + new Date().toLocaleTimeString(),
          })
        }>
        Update first block
      </button>
      {/*Removes the currently selected block*/}
      <button onClick={() => editor.removeBlocks([editor.document[0]])}>
        Remove first block
      </button>
      {/*Replaces the currently selected block*/}
      <button
        onClick={() =>
          editor.replaceBlocks(
            [editor.document[0]],
            [
              {
                content:
                  "This block was replaced at " +
                  new Date().toLocaleTimeString(),
              },
            ]
          )
        }>
        Replace first block
      </button>
    </div>
  );
}
