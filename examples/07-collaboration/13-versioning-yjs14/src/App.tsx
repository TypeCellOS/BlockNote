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
  VersioningSidebar,
} from "@blocknote/react";
import { useEffect, useState } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

import * as Y from "@y/y";
import { WebsocketProvider } from "@y/websocket";

import { seedSampleVersions } from "./sampleDocument";
import { resolveUsers } from "./userdata";
import "./style.css";

// YHub serves both real-time sync (over WebSocket) and version history (over
// HTTP) for the same document, so the backend URL, org, and docId are shared.
const yhubHost = "yhub.teleportal.tools";
const org = "blocknote";
const docId = `blocknote-version-yjs14-${Math.floor(Date.now())}`;

// YHub-backed versioning endpoints. YHub stores continuous edit history and
// exposes its activity timeline as versions through BlockNote's versioning UI.
// Constructing this opens no connection, so it's safe to do before seeding.
const versioningEndpoints = createYHubVersioningEndpoints({
  baseUrl: `https://${yhubHost}`,
  org,
  docId,
});

const doc = new Y.Doc();
const provider = new WebsocketProvider(
  `wss://${yhubHost}/ws`,
  `${org}/${docId}`,
  doc,
  {
    params: {
      userid: "test",
    },
  },
);

const preparePromise: Promise<void> = (async () => {
  // Wait for the server's existing content (if any) to load.
  if (!provider.synced) {
    await new Promise((resolve) => provider.once("sync", resolve));
  }

  // Seed only when the synced document is genuinely empty.
  if (!(doc.get("bn").length > 0)) {
    provider.disconnect();
    await seedSampleVersions({
      baseUrl: `https://${yhubHost}`,
      org,
      docId,
      fragment: "bn",
    });
    provider.connect();
  }
})();

/**
 * Gate: prepare the document (seed + connect + first sync) BEFORE creating the
 * editor, so the editor adopts the synced content instead of writing a competing
 * initial blockGroup.
 */
export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void preparePromise
      .then(() => {
        if (!cancelled) {
          setReady(true);
        }
      })
      .catch(() => {
        /* error already logged in prepareDocument */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return <div className="wrapper loading">Preparing document…</div>;
  }

  return <VersionedEditor />;
}

function VersionedEditor() {
  // The provider is already connected and synced (see `prepareDocument`), and
  // the local `doc` holds the server's content, so the editor adopts it.
  const editor = useCreateBlockNote(
    withCollaboration({
      collaboration: {
        provider: provider ?? undefined,
        fragment: doc.get("bn"),
        user: { color: "#ff0000", name: "User" },
        // Pass versioningEndpoints to the v14 CollaborationExtension which
        // automatically wires up the VersioningExtension with the Yjs adapter.
        versioningEndpoints,
        // Resolves version-author ids (the seed's `attribution.by`) to usernames
        // in the history sidebar and diff tooltips.
        resolveUsers,
      },
    }),
  );

  const { previewedSnapshotId } = useExtensionState(VersioningExtension, {
    editor,
  });

  const [showSidebar, setShowSidebar] = useState(true);

  const versioning = useExtension(VersioningExtension, { editor });
  useEffect(() => {
    versioning.listSnapshots();
    const interval = setInterval(() => {
      versioning.listSnapshots();
    }, 10000);
    return () => {
      clearInterval(interval);
    };
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
            {!showSidebar && (
              <button
                className="show-history-button"
                onClick={() => setShowSidebar(true)}
              >
                History
              </button>
            )}
          </div>
          {showSidebar && (
            <div className={"sidebar-section"}>
              <VersioningSidebar
                filter={"all"}
                onClose={() => setShowSidebar(false)}
              />
            </div>
          )}
        </div>
      </BlockNoteView>
    </div>
  );
}
