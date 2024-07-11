import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

export default function App() {
  // Disable the Audio and Image blocks from the built-in schema
  const schema = BlockNoteSchema.create({
    blockSpecs: {
      //first pass all the blockspecs from the built in, default block schema
      ...defaultBlockSpecs,

      // disable blocks you don't want
      audio: undefined as any,
      image: undefined as any,
    },
  });

  // Creates a new editor instance with the schema
  const editor = useCreateBlockNote({
    schema,
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
