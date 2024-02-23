import { BlockNoteView, useCreateBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

import "./styles.css";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    // Sets attributes on DOM elements in the editor.
    domAttributes: {
      // Adds a class to all `blockContainer` elements.
      blockContainer: {
        class: "block-container",
      },
    },
  });

  // Renders the editor instance using a React component.
  // Adds `data-theming-dom-attributes-demo` to restrict styles to only this demo.
  return <BlockNoteView editor={editor} data-theming-dom-attributes-demo />;
}
