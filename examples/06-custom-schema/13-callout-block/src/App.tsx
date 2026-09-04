import { BlockNoteSchema } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

import { createCallout } from "./Callout";
import "./styles.css";

// Our schema with block specs, which contain the configs and implementations
// for blocks that we want our editor to use.
const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    // Creates an instance of the Callout block and adds it to the schema.
    callout: createCallout(),
  },
});

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    schema,
    initialContent: [
      {
        type: "paragraph",
        content: "A callout has a title and a body:",
      },
      {
        type: "callout",
        props: { flavor: "warning" },
        content: "Careful with this one",
        children: [
          {
            type: "paragraph",
            content:
              "The body is made of nested blocks, so it takes anything: lists, headings, even another callout.",
          },
          {
            type: "bulletListItem",
            content: "Press Tab and Enter in here as usual",
          },
        ],
      },
      {
        type: "paragraph",
        content: "Click the icon to change the callout's flavor.",
      },
    ],
  });

  // Renders the editor instance.
  return <BlockNoteView editor={editor} />;
}
