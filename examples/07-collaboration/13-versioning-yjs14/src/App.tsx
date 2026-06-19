import "@blocknote/core/fonts/inter.css";
import {
  createYHubVersioningEndpoints,
  withCollaboration,
} from "@blocknote/core/y";
import { VersioningExtension } from "@blocknote/core/extensions";
import {
  BlockNoteViewEditor,
  useCreateBlockNote,
  useExtension,
  useExtensionState,
} from "@blocknote/react";
import { useEffect } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

import * as Y from "@y/y";
import { WebsocketProvider } from "@y/websocket";

import { VersionHistorySidebar } from "./VersionHistorySidebar.js";
import "./style.css";

// YHub serves both real-time sync (over WebSocket) and version history (over
// HTTP) for the same document, so the backend URL, org, and docId are shared.
const yhubHost = "yhub-standalone-x9kss.ondigitalocean.app";
const org = "blocknote-versioning-yjs14";
const docId = "blocknote-versioning-y-example-5";

const doc = new Y.Doc();
// YHub expects clients to connect to `/ws/{org}/{docId}`. WebsocketProvider
// joins its base URL and room with a slash, so the room is `{org}/{docId}`.
const provider = new WebsocketProvider(
  `wss://${yhubHost}/ws`,
  `${org}/${docId}`,
  doc,
);
// provider.connectBc();

// YHub-backed versioning endpoints. YHub stores continuous edit history and
// exposes its activity timeline as versions through BlockNote's versioning UI.
const versioningEndpoints = createYHubVersioningEndpoints({
  baseUrl: `https://${yhubHost}`,
  org,
  docId,
});

export default function App() {
  const editor = useCreateBlockNote(
    withCollaboration({
      collaboration: {
        provider,
        fragment: doc.get(),
        user: { color: "#ff0000", name: "User" },
        // Pass versioningEndpoints to the v14 CollaborationExtension which
        // automatically wires up the VersioningExtension with the Yjs adapter.
        versioningEndpoints,
      },
    }),
  );

  const { previewedSnapshotId } = useExtensionState(VersioningExtension, {
    editor,
  });

  // The versioning store starts empty on every page load, so fetch the list of
  // versions from YHub once when the editor mounts. Without this, the sidebar
  // only shows versions created during the current session.
  const versioning = useExtension(VersioningExtension, { editor });
  useEffect(() => {
    void versioning.listSnapshots();
  }, [versioning]);

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
