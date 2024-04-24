import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/core/fonts/inter.css";
import { uploadToTmpFilesDotOrg_DEV_ONLY } from "@blocknote/core";

// import { BlockNoteView } from "@blocknote/mantine";
// import "@blocknote/mantine/style.css";
import { BlockNoteView } from "@blocknote/ariakit";
import "@blocknote/ariakit/style.css";
// import { BlockNoteView } from "@blocknote/shadcn";
// import "@blocknote/shadcn/style.css";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    uploadFile: uploadToTmpFilesDotOrg_DEV_ONLY,
    initialContent: [
      {
        type: "image",
      },
      {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            {
              cells: ["", "", ""],
            },
            {
              cells: ["", "", ""],
            },
            {
              cells: ["", "", ""],
            },
          ],
        },
      },
      {
        type: "paragraph",
        content: "Hello, world!",
      },
    ],
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView editor={editor} />;
}
