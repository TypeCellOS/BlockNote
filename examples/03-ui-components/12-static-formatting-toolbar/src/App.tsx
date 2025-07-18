import "@blocknote/core/fonts/inter.css";
import { FormattingToolbar, useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

import "./style.css";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
      },
      {
        type: "paragraph",
        content: "Check out the static formatting toolbar above!",
      },
      {
        type: "paragraph",
      },
    ],
  });

  // Renders the editor instance using a React component.
  return (
    // Disables the default formatting toolbar and re-adds it without the
    // `FormattingToolbarController` component. You may have seen
    // `FormattingToolbarController` used in other examples, but we omit it here
    // as we want to control the position and visibility ourselves. BlockNote
    // also uses the `FormattingToolbarController` when displaying the
    // Formatting Toolbar by default.
    <BlockNoteView editor={editor} formattingToolbar={false}>
      <FormattingToolbar />
    </BlockNoteView>
  );
}
