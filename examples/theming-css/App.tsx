import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";
export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor = useBlockNote();
  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
