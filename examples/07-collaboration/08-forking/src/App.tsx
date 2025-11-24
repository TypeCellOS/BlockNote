import "@blocknote/core/fonts/inter.css";
import {} from "@blocknote/core";
import { ForkYDocExtension } from "@blocknote/core/extensions";
import {
  useCreateBlockNote,
  useExtension,
  useExtensionState,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import YPartyKitProvider from "y-partykit/provider";
import * as Y from "yjs";

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
  const forkYDocPlugin = useExtension(ForkYDocExtension, { editor });
  const isForked = useExtensionState(ForkYDocExtension, {
    editor,
    selector: (state) => state.isForked,
  });

  // Renders the editor instance.
  return (
    <>
      <button
        onClick={() => {
          forkYDocPlugin.fork();
        }}
        disabled={isForked}
      >
        Pause syncing
      </button>
      <button
        onClick={() => {
          forkYDocPlugin.merge({ keepChanges: true });
        }}
        disabled={!isForked}
      >
        Play (accept changes)
      </button>
      <button
        onClick={() => {
          forkYDocPlugin.merge({ keepChanges: false });
        }}
        disabled={!isForked}
      >
        Play (reject changes)
      </button>
      <div>
        <p>Forked: {isForked ? "Yes" : "No"}</p>
      </div>
      <BlockNoteView editor={editor} />
    </>
  );
}
