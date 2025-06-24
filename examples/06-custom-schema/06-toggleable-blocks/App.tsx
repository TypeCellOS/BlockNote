import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

import { ToggleBlock } from "./Toggle.js";

// Our schema with block specs, which contain the configs and implementations for
// blocks that we want our editor to use.
const schema = BlockNoteSchema.create({
  blockSpecs: {
    // Adds all default blocks.
    ...defaultBlockSpecs,
    // Adds the Toggle block.
    toggle: ToggleBlock,
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
        // We set a persistent ID so that the toggled state is preserved
        // on reload.
        id: "toggle",
        type: "toggle",
        content: "This is an example toggle",
        children: [
          {
            type: "paragraph",
            content: "This is the first child of the toggle block.",
          },
          {
            type: "paragraph",
            content: "This is the second child of the toggle block.",
          },
        ],
      },
      {
        type: "paragraph",
        content: "Click the '>' icon to show/hide its children",
      },
      {
        type: "paragraph",
      },
    ],
  });

  // Renders the editor instance.
  return <BlockNoteView editor={editor} />;
}
