import "@blocknote/core/fonts/inter.css";
import { withCollaboration } from "@blocknote/core/yjs";
import { VersioningExtension } from "@blocknote/core/extensions";
import { createYjsVersioningAdapter } from "@blocknote/core/yjs";
import { localStorageEndpoints } from "./localStorageEndpoints.js";
import {
  BlockNoteViewEditor,
  useCreateBlockNote,
  useExtensionState,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

import { VersionHistorySidebar } from "./VersionHistorySidebar.js";
import "./style.css";

const roomName = "blocknote-versioning-yjs-example";
const doc = new Y.Doc();
const fragment = doc.getXmlFragment("document-store");
const provider = new WebsocketProvider(
  "wss://demos.yjs.dev/ws",
  roomName,
  doc,
  { connect: false },
);
provider.connectBc();

export default function App() {
  const editor = useCreateBlockNote(
    withCollaboration({
      collaboration: {
        provider,
        fragment,
        user: { color: "#ff0000", name: "User" },
      },
      extensions: [
        // The v13 CollaborationExtension does not wire up versioning
        // automatically, so we add VersioningExtension manually and use
        // createYjsVersioningAdapter to bridge the Yjs v13 preview logic.
        VersioningExtension((editor) => ({
          ...createYjsVersioningAdapter(editor, { fragment } as any),
          endpoints: localStorageEndpoints,
        })),
      ],
    }),
  );

  const { previewedSnapshotId } = useExtensionState(VersioningExtension, {
    editor,
  });

  return (
    <div className="wrapper">
      <BlockNoteView
        editor={editor}
        editable={previewedSnapshotId === undefined}
        renderEditor={false}
      >
        <div className="layout">
          <div className="editor-panel">
            <BlockNoteViewEditor />
          </div>
          <VersionHistorySidebar />
        </div>
      </BlockNoteView>
    </div>
  );
}
