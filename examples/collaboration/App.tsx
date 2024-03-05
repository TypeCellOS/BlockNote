import { uploadToTmpFilesDotOrg_DEV_ONLY } from "@blocknote/core";
import { BlockNoteView, useBlockNote } from "@blocknote/react";
import "@blocknote/react/style.css";

import YPartyKitProvider from "y-partykit/provider";
import * as Y from "yjs";

const doc = new Y.Doc();

const provider = new YPartyKitProvider(
  "blocknote-dev.yousefed.partykit.dev",
  // use a unique name as a "room" for your application:
  "your-project-name",
  doc
);

export default function App() {
  const editor = useBlockNote({
    domAttributes: {
      editor: {
        class: "editor",
        "data-test": "editor",
      },
    },
    collaboration: {
      // The Yjs Provider responsible for transporting updates:
      provider,
      // Where to store BlockNote data in the Y.Doc:
      fragment: doc.getXmlFragment("document-store"),
      // Information (name and color) for this user:
      user: {
        name: "My Username",
        color: "#ff0000",
      },
    },
    uploadFile: uploadToTmpFilesDotOrg_DEV_ONLY,
  });

  return <BlockNoteView className="root" editor={editor} />;
}
