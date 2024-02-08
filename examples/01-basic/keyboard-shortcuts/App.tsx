import {
  Block,
  BlockNoteEditor,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
} from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

const cycleBlocksShortcut = (event: KeyboardEvent, editor: BlockNoteEditor) => {
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
  const editor: BlockNoteEditor = useBlockNote({
    // Adds event handler on key down when the editor is ready
    onEditorReady: (editor) =>
      editor.domElement.addEventListener("keydown", (event) =>
        cycleBlocksShortcut(event, editor)
      ),
  });

  return <BlockNoteView editor={editor} theme={"light"} />;
}
