import "@blocknote/core/fonts/inter.css";
import { withCollaboration } from "@blocknote/core/y";
import { VersioningExtension } from "@blocknote/core/extensions";
import { localStorageEndpoints } from "./localStorageEndpoints.js";
import {
  BlockNoteViewEditor,
  useCreateBlockNote,
  useExtensionState,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

import * as Y from "@y/y";
import { WebsocketProvider } from "@y/websocket";

import { VersionHistorySidebar } from "./VersionHistorySidebar";
import "./style.css";

const roomName = "blocknote-versioning-y-example";
const doc = new Y.Doc();
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
        fragment: doc.get(),
        user: { color: "#ff0000", name: "User" },
        // Pass versioningEndpoints to the v14 CollaborationExtension which
        // automatically wires up the VersioningExtension with the Yjs adapter.
        versioningEndpoints: localStorageEndpoints,
      },
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
