import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "columnList",
        children: [
          {
            type: "column",
            children: [
              {
                type: "paragraph",
                content: "Hello world 1",
              },
            ],
          },
          {
            type: "column",
            children: [
              {
                type: "paragraph",
                content: "Hello world 2",
              },
            ],
          },
        ],
      },
      {
        type: "paragraph",
        content: "Hello world 3",
      },
    ],
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
