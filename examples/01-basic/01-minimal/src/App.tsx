import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteSchema2 } from "@blocknote/core";

const schema = BlockNoteSchema2.create();

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    schema: schema as any,
    initialContent: [
      {
        type: "numberedListItem",
        content: "Numbered List Item 1",
      },
      {
        type: "numberedListItem",
        content: "Numbered List Item 2",
      },
    ],
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
