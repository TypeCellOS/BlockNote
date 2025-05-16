import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import YPartyKitProvider from "y-partykit/provider";
import * as Y from "yjs";
import { useEffect } from "react";
import { useState } from "react";

// Sets up Yjs document and PartyKit Yjs provider.
const doc = new Y.Doc();
const provider = new YPartyKitProvider(
  "blocknote-dev.yousefed.partykit.dev",
  // Use a unique name as a "room" for your application.
  "your-project-name-room",
  doc,
);

export default function App() {
  const editor = useCreateBlockNote({
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
  });
  const [forked, setForked] = useState(false);
  useEffect(() => {
    editor.extensions["ForkYDocPlugin"].on("forked", setForked);
  }, [editor]);

  // Renders the editor instance.
  return (
    <>
      <button
        onClick={() => {
          editor.extensions["ForkYDocPlugin"].forkYjsSync();
        }}
      >
        Pause syncing
      </button>
      <button
        onClick={() => {
          editor.extensions["ForkYDocPlugin"].resumeYjsSync(true);
        }}
      >
        Play (accept changes)
      </button>
      <button
        onClick={() => {
          editor.extensions["ForkYDocPlugin"].resumeYjsSync(false);
        }}
      >
        Play (reject changes)
      </button>
      <div>
        <p>Forked: {forked ? "Yes" : "No"}</p>
      </div>
      <BlockNoteView editor={editor} />
    </>
  );
}
