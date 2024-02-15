import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";
import { useCallback } from "react";

export default function App() {
  // Creates a new editor instance.
  const editor = useBlockNote({});

  const onSelectionChange = useCallback(() => {
    // Gets the blocks currently spanned by the selection.
    const selectedBlocks = editor.getSelection()?.blocks;
    // Converts array of blocks to set of block IDs for more efficient comparison.
    const selectedBlockIds = new Set<string>(
      selectedBlocks?.map((block) => block.id) || []
    );

    // Traverses all blocks.
    editor.forEachBlock((block) => {
      // If no selection is active, resets the background color of each block.
      if (selectedBlockIds.size === 0) {
        editor.updateBlock(block, {
          props: { backgroundColor: "default" },
        });

        return true;
      }

      if (
        selectedBlockIds.has(block.id) &&
        block.props.backgroundColor !== "blue"
      ) {
        // If the block is currently spanned by the selection, makes its
        // background blue if it isn't already.
        editor.updateBlock(block, {
          props: { backgroundColor: "blue" },
        });
      } else if (
        !selectedBlockIds.has(block.id) &&
        block.props.backgroundColor === "blue"
      ) {
        // If the block is not currently spanned by the selection, resets
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
