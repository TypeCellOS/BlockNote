import { uploadToTmpFilesDotOrg_DEV_ONLY } from "@blocknote/core";
import "@blocknote/core/style.css";
import { BlockNoteView, useBlockNote } from "@blocknote/react";

export default function App() {
  const editor = useBlockNote({
    domAttributes: {
      editor: {
        class: "editor",
        "data-test": "editor",
      },
    },
    uploadFile: uploadToTmpFilesDotOrg_DEV_ONLY,
  });

  return <BlockNoteView className="root" editor={editor} />;
}
