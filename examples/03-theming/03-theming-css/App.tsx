import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

import "./styles.css";

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
        content: "You'll see that the text is now blue",
      },
      {
        type: "paragraph",
        content:
          "Press the '/' key - the hovered Slash Menu items are also blue",
      },
      {
        type: "paragraph",
      },
    ],
  });

  // Renders the editor instance using a React component.
  // Adds `data-theming-css-demo` to restrict styles to only this demo.
  return <BlockNoteView editor={editor} data-theming-css-demo />;
}
