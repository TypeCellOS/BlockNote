import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

export default function App() {
  // Creates a new editor instance.
  const editor = useBlockNote();

  // Renders the editor instance.
  return <BlockNoteView editor={editor}>{/* TODO */}</BlockNoteView>;
}
