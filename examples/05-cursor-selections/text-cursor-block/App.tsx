import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

import "@blocknote/react/style.css";
import { useCallback } from "react";

export default function App() {
  // Creates a new editor instance.
  const editor = useBlockNote({});

  const onSelectionChange = useCallback(() => {
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
  }, [editor]);

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor} onSelectionChange={onSelectionChange} />
  );
}
