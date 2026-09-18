import { VersioningSidebar } from "@blocknote/react/versioning";
import "@blocknote/core/fonts/inter.css";
import {
  createYHubVersioningEndpoints,
  withCollaboration,
} from "@blocknote/core/y";
import { BlockNoteViewEditor, useCreateBlockNote } from "@blocknote/react";
import { useEffect, useState } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

import * as Y from "@y/y";
import { WebsocketProvider } from "@y/websocket";

import { seedSampleVersions } from "./sampleDocument";
import { resolveUsers, USERS } from "./userdata";
import "./style.css";

// YHub serves both real-time sync (over WebSocket) and version history (over
// HTTP) for the same document, so the backend URL, org, and docId are shared.
const yhubHost = "yhub.teleportal.tools";
const org = "blocknote";
const docId = `blocknote-version-yjs14-${Math.floor(Date.now())}`;

const DAY_MS = 24 * 60 * 60 * 1000;

// Who this tab is editing as. The same id goes to YHub (as the websocket's
// `userid`, which is what it attributes edits to) and to the editor's cursor,
// so this session's own edits resolve to "Alice" in the history sidebar rather
// than to a bare id.
const currentUser = USERS[0];

// YHub-backed versioning endpoints. YHub stores continuous edit history and
// exposes its activity timeline as versions through BlockNote's versioning UI.
// Constructing this opens no connection, so it's safe to do before seeding.
const versioningOptions = {
  baseUrl: `https://${yhubHost}/api`,
  org,
  docId,
  activityParams: {
    // The seeded history has a few hundred edits; a high limit lets the
    // sidebar render all the grouped entries.
    limit: "500",
    // The seeded history spans weeks with days between versions (see
    // `snapshotBuilder`), so a day-wide grouping window is what makes it read
    // as one row per version. Real documents want the 1 h default.
    groupMaxGap: String(1 * DAY_MS),
  },
};
const versioningEndpoints = createYHubVersioningEndpoints(versioningOptions);

const doc = new Y.Doc();
const provider = new WebsocketProvider(
  `wss://${yhubHost}/api/ws/v1`,
  `${org}/${docId}`,
  doc,
  {
    params: {
      userid: currentUser.id,
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
    const versions = await seedSampleVersions({
      baseUrl: `https://${yhubHost}/api`,
      org,
      docId,
      fragment: "bn",
    });
    provider.connect();
    // Reconnecting starts a new sync. Do not mount the editor against the
    // still-empty local document while the seeded content is in flight.
    if (!provider.synced) {
      await new Promise<void>((resolve) => {
        function onSync(synced: boolean) {
          if (synced) {
            provider.off("sync", onSync);
            resolve();
          }
        }
        provider.on("sync", onSync);
      });
    }

    // Version *names* aren't part of YHub's history: they live in a
    // `__bn_versions` array on the live document, keyed by the server timestamp
    // they label (see `createYHubVersioningEndpoints`). The seeder returns each
    // version's last-edit timestamp, which is exactly that key.
    doc.get("__bn_versions").push(
      versions.map((version) => ({
        id: version.to,
        name: version.name,
      })) as never,
    );
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
        user: {
          id: currentUser.id,
          color: currentUser.color ?? "#ff0000",
          name: currentUser.username,
        },
        // Pass versioningEndpoints to the v14 CollaborationExtension which
        // automatically wires up the VersioningExtension with the Yjs adapter.
        versioningEndpoints,
        // Resolves version-author ids (the seed's `attribution.by`) to usernames
        // in the history sidebar and diff tooltips.
        resolveUsers,
      },
    }),
  );

  const [showSidebar, setShowSidebar] = useState(true);

  return (
    <div className="wrapper">
      {/* The sidebar makes the editor read-only for as long as it is open —
          that's the versioning extension's job, so there's no `editable` prop
          to manage here. */}
      <BlockNoteView editor={editor} renderEditor={false}>
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
              <VersioningSidebar onClose={() => setShowSidebar(false)} />
            </div>
          )}
        </div>
      </BlockNoteView>
    </div>
  );
}
