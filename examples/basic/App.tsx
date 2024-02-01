import { uploadToTmpFilesDotOrg_DEV_ONLY } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

export default function App() {
  // Creates a new editor instance.
  const editor = useBlockNote({
    domAttributes: {
      editor: {
        class: "editor",
        "data-test": "editor",
      },
    },
    uploadFile: uploadToTmpFilesDotOrg_DEV_ONLY,
  });

  // Renders the editor instance using a React component.
  return <BlockNoteView className="root" editor={editor} />;
}
