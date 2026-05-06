import { BlockNoteSchema } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

import { createNonEditableBlock } from "./NonEditableBlock";

// Our schema with block specs, which contain the configs and implementations for
// blocks that we want our editor to use.
const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    // Creates an instance of the Non-Editable block and adds it to the schema.
    nonEditable: createNonEditableBlock(),
  },
});

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    schema,
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
      },
      {
        type: "nonEditable",
      },
      {
        type: "paragraph",
      },
    ],
  });

  // Renders the editor instance.
  return <BlockNoteView editor={editor} />;
}
