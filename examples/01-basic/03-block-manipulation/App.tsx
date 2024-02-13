import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

export default function App() {
  const editor = useBlockNote();

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
            editor.topLevelBlocks[editor.topLevelBlocks.length - 1],
            "after"
          )
        }>
        Add block
      </button>
      {/*Updates the currently selected block*/}
      <button
        onClick={() =>
          editor.updateBlock(editor.topLevelBlocks[0], {
            content:
              "This block was updated at " + new Date().toLocaleTimeString(),
          })
        }>
        Update first block
      </button>
      {/*Removes the currently selected block*/}
      <button onClick={() => editor.removeBlocks([editor.topLevelBlocks[0]])}>
        Remove first block
      </button>
      {/*Replaces the currently selected block*/}
      <button
        onClick={() =>
          editor.replaceBlocks(
            [editor.topLevelBlocks[0]],
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
