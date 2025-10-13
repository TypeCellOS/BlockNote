import { BlockNoteSchema, createHeadingBlockSpec } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    // Creates a default schema and extends it with a configured heading block.
    schema: BlockNoteSchema.create().extend({
      blockSpecs: {
        heading: createHeadingBlockSpec({
          // Disables toggleable headings.
          allowToggleHeadings: false,
          // Sets the allowed heading levels.
          levels: [1, 2, 3],
        }),
      },
    }),
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
