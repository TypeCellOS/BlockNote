import {
  BlockNoteView,
  FormattingToolbarController,
  useCreateBlockNote,
} from "@blocknote/react";
import "@blocknote/react/style.css";

import { CustomFormattingToolbar } from "./CustomFormattingToolbar";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote();

  // Renders the editor instance.
  return (
    <BlockNoteView editor={editor} formattingToolbar={false}>
      <FormattingToolbarController
        formattingToolbar={CustomFormattingToolbar}
      />
    </BlockNoteView>
  );
}
