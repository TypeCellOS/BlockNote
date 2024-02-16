import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

import { CustomFormattingToolbar } from "./CustomFormattingToolbar";

export default function App() {
  // Creates a new editor instance.
  const editor = useBlockNote();

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor} formattingToolbar={false}>
      <CustomFormattingToolbar editor={editor} />
    </BlockNoteView>
  );
}
