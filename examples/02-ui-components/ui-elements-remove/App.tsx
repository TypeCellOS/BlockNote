import { BlockNoteView, useCreateBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote();

  // Renders the editor instance.
  return (
    <BlockNoteView
      editor={editor}
      formattingToolbar={false}
      hyperlinkToolbar={false}
      imageToolbar={false}
      sideMenu={false}
      slashMenu={false}
      tableHandles={false}
    />
  );
}
