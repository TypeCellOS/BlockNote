export default `import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/core/style.css";
import theme from "./theme";

export default function App() {
  // Creates a new editor instance.
  const editor: BlockNoteEditor | null = useBlockNote({
    theme: theme
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}`;
