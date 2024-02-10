import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

import { customSlashMenuItems } from "./CustomSlashMenuItems";

export default function App() {
  // Creates a new editor instance.
  const editor = useBlockNote({
    slashMenuItems: customSlashMenuItems,
  });

  // Renders the editor instance.
  return <BlockNoteView editor={editor} />;
}
