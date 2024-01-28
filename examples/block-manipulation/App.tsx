import { BlockNoteEditor } from "@blocknote/core";
import "@blocknote/core/style.css";
import { BlockNoteView, useBlockNote } from "@blocknote/react";

export default function App() {
  const editor: BlockNoteEditor = useBlockNote();

  return (
    <div>
      <BlockNoteView editor={editor} theme={"light"} />
      {/*Inserts a new block below the currently selected block.*/}
      <button
        onClick={() =>
          editor.insertBlocks(
            [{ content: "This block was inserted!" }],
            editor.getTextCursorPosition().block,
            "after"
          )
        }>
        Insert
      </button>
      {/*Updates the currently selected block*/}
      <button
        onClick={() =>
          editor.updateBlock(editor.getTextCursorPosition().block, {
            content: "This block was updated!",
          })
        }>
        Update
      </button>
      {/*Removes the currently selected block*/}
      <button
        onClick={() =>
          editor.removeBlocks([editor.getTextCursorPosition().block])
        }>
        Remove
      </button>
      {/*Replaces the currently selected block*/}
      <button
        onClick={() =>
          editor.replaceBlocks(
            [editor.getTextCursorPosition().block],
            [
              {
                content: "This block was replaced!",
              },
            ]
          )
        }>
        Replace
      </button>
    </div>
  );
}
