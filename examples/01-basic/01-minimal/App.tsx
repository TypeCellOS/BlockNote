import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote, BlockNoteView } from "@blocknote/ai";
import "@blocknote/mantine/style.css";
// import { useCreateBlockNote } from "@blocknote/react";
// import { BlockNoteView } from "@blocknote/mantine";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote();

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
