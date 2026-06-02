import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

import { macroBlock } from "./Macro";
import "./styles.css";

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    macro: macroBlock(),
  },
});

export default function App() {
  const editor = useCreateBlockNote({
    schema,
    initialContent: [
      {
        type: "paragraph",
        content:
          "Below are two macro blocks. Each looks up its before/after content from a global registry by id — the first uses HTML strings, the second uses a live <input> element:",
      },
      {
        type: "macro",
        props: { id: "warning" },
        content: "Stay hydrated while editing",
      },
      {
        type: "macro",
        props: { id: "note" },
        content: "Type a note here, then add a label on the left",
      },
      {
        type: "paragraph",
        content: "Edit the inline text inside each macro to see it stay live.",
      },
    ],
  });

  return <BlockNoteView editor={editor} />;
}
