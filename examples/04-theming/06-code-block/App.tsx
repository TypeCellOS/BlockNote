import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
// This packages some of the most used languages in on-demand bundle
import { codeBlock } from "@blocknote/code-block";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    codeBlock,
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
