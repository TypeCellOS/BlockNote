import { BlockNoteView, useCreateBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

import "./styles.css";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote();
  // Renders the editor instance using a React component.
  // Adds `data-theming-css-demo` to restrict styles to only this demo.
  return <BlockNoteView editor={editor} data-theming-css-demo />;
}
