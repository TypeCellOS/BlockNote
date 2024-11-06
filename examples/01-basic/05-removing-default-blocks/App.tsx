import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

export default function App() {
  // Disable the Audio and Image blocks from the built-in schema
  // This is done by picking out the blocks you want to disable
  const { audio, image, ...remainingBlockSpecs } = defaultBlockSpecs;

  const schema = BlockNoteSchema.create({
    blockSpecs: {
      // remainingBlockSpecs contains all the other blocks
      ...remainingBlockSpecs,
    },
  });

  // Creates a new editor instance with the schema
  const editor = useCreateBlockNote({
    schema,
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
