import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

import "./styles.css";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    // Sets attributes on DOM elements in the editor.
    domAttributes: {
      // Adds a class to all `blockContainer` elements.
      block: {
        class: "hello-world-block",
      },
    },
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
      },
      {
        type: "paragraph",
        content: "You can see there's a border around each block",
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "This is because there's a CSS rule using the ",
            styles: {},
          },
          {
            type: "text",
            text: "hello-world-block",
            styles: { code: true },
          },
          {
            type: "text",
            text: " class we added",
            styles: {},
          },
        ],
      },
      {
        type: "paragraph",
      },
    ],
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
