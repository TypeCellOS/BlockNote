import {
  Block,
  BlockNoteEditor,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
} from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

const cycleBlocksShortcut = (
  event: React.KeyboardEvent,
  editor: BlockNoteEditor
) => {
  // Checks for Ctrl+G shortcut
  if (event.ctrlKey && event.key === "g") {
    // Needs type cast as Object.keys doesn't preserve type
    const allBlockTypes = Object.keys(editor.blockSchema) as Block<
      DefaultBlockSchema,
      DefaultInlineContentSchema,
      DefaultStyleSchema
    >["type"][];

    const currentBlockType = editor.getTextCursorPosition().block.type;

    const nextBlockType =
      allBlockTypes[
        (allBlockTypes.indexOf(currentBlockType) + 1) % allBlockTypes.length
      ];

    editor.updateBlock(editor.getTextCursorPosition().block, {
      type: nextBlockType,
    });
  }
};

export default function App() {
  const editor = useBlockNote({});

  const onKeyDown = (event: React.KeyboardEvent) => {
    cycleBlocksShortcut(event, editor);
  };

  return <BlockNoteView editor={editor} onKeyDown={onKeyDown} />;
}
