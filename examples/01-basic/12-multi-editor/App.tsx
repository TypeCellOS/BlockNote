import { PartialBlock } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

// Component that creates & renders a BlockNote editor.
function Editor(props: { initialContent?: PartialBlock[] }) {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    sideMenuDetection: "editor",
    initialContent: props.initialContent,
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} style={{ flex: 1 }} />;
}

export default function App() {
  // Creates & renders two editors side by side.
  return (
    <div style={{ display: "flex" }}>
      <Editor
        initialContent={[
          {
            type: "paragraph",
            content: "Welcome to this demo!",
          },
          {
            type: "paragraph",
            content: "This is a block in the first editor",
          },
          {
            type: "paragraph",
          },
        ]}
      />
      <Editor
        initialContent={[
          {
            type: "paragraph",
            content: "This is a block in the second editor",
          },
          {
            type: "paragraph",
            content: "Try dragging blocks from one editor to the other",
          },
          {
            type: "paragraph",
          },
        ]}
      />
    </div>
  );
}
