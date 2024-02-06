import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

export default function App() {
  // Creates a new editor instance.
  const editor = useBlockNote({
    // Listens for when the text cursor position changes.
    onTextCursorPositionChange: (editor) => {
      // Gets the block currently hovered by the text cursor.
      const hoveredBlock = editor.getTextCursorPosition().block;

      // Traverses all blocks.
      editor.forEachBlock((block) => {
        if (
          block.id === hoveredBlock.id &&
          block.props.backgroundColor !== "blue"
        ) {
          // If the block is currently hovered by the text cursor, makes its
          // background blue if it isn't already.
          editor.updateBlock(block, {
            props: { backgroundColor: "blue" },
          });
        } else if (
          block.id !== hoveredBlock.id &&
          block.props.backgroundColor === "blue"
        ) {
          // If the block is not currently hovered by the text cursor, resets
          // its background if it's blue.
          editor.updateBlock(block, {
            props: { backgroundColor: "default" },
          });
        }

        return true;
      });
    },
  });

  // Renders the editor instance.
  return <BlockNoteView editor={editor} theme={"light"} />;
}
