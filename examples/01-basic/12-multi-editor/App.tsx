import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

function Editor() {
  const editor = useCreateBlockNote();

  return <BlockNoteView editor={editor} style={{ flex: 1 }} />;
}

export default function App() {
  return (
    <div style={{ display: "flex" }}>
      <Editor />
      <Editor />
    </div>
  );
}
