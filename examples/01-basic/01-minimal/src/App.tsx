import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteSchema2 } from "@blocknote/core";
import { codeBlock } from "@blocknote/code-block";

const schema = BlockNoteSchema2.create(undefined, {
  codeBlock,
});

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    schema: schema as any,
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
