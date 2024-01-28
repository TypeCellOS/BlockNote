import { BlockNoteEditor } from "@blocknote/core";
import "@blocknote/core/style.css";
import { BlockNoteView, useBlockNote } from "@blocknote/react";

export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor = useBlockNote();

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} theme={"light"} />;
}
