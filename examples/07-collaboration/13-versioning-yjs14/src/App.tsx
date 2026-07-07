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
//
// The options are held in a mutable object so the "Configuration" panel below
// can retune `groupMaxGap`/`groupMaxDuration` live: `list()` reads those two
// fields fresh on each call, so writing new values here + re-running `list()`
// reshapes the history sidebar against the same document, no editor recreation.
const versioningOptions = {
  baseUrl: `https://${yhubHost}`,
  org,
  docId,
  // The seeded history has a few hundred edits; a high limit lets the sidebar
  // render *all* the grouped entries, so dragging groupMaxGap visibly grows and
  // shrinks the list instead of always bumping against a low cap.
  activityLimit: 500,
  // Open already well-grouped (~one row per author-run) so the history reads as
  // a short, understandable list; dragging groupMaxGap down explodes it.
  groupMaxGap: 60 * 60_000,
  groupMaxDuration: undefined as number | undefined,
};
const versioningEndpoints = createYHubVersioningEndpoints(versioningOptions);

// Slider bounds for the grouping knobs. The sample history spaces edits 30s–1h
// apart (see snapshotBuilder), so a 0–1h range in 30s steps spans the whole
// useful spectrum: at 0 every edit is its own row, and near an hour a version's
// same-author runs collapse together. The controls display m/s for legibility.
const GROUP_SLIDER_MAX_MS = 60 * 60_000;
const GROUP_SLIDER_STEP_MS = 30_000;
const formatMs = (ms: number) => {
  if (ms >= 60_000) {
    const mins = ms / 60_000;
    return `${mins.toFixed(mins % 1 === 0 ? 0 : 1)}m`;
  }
  return `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s`;
};

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
    versioning.list();
    const interval = setInterval(() => {
      versioning.list();
    }, 10000);
    return () => {
      clearInterval(interval);
    };
  }, [versioning]);

  // Local mirror of the two grouping knobs. Changing either writes the value
  // back onto the shared `versioningOptions` object and re-runs `list()` so the
  // history sidebar re-groups immediately (the core `list()` reads these live).
  const [showSettings, setShowSettings] = useState(false);
  const [groupMaxGap, setGroupMaxGap] = useState(versioningOptions.groupMaxGap);
  const [groupMaxDuration, setGroupMaxDuration] = useState(
    versioningOptions.groupMaxDuration,
  );

  const applyGroupMaxGap = (value: number) => {
    setGroupMaxGap(value);
    versioningOptions.groupMaxGap = value;
    versioning.list();
  };

  const applyGroupMaxDuration = (value: number | undefined) => {
    setGroupMaxDuration(value);
    versioningOptions.groupMaxDuration = value;
    versioning.list();
  };

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

            {showSettings && (
              <div className="config-panel">
                <div className="config-panel-title">Configuration</div>

                <div className="config-row">
                  <label htmlFor="groupMaxGap">
                    groupMaxGap
                    <span className="config-value">
                      {formatMs(groupMaxGap)}
                    </span>
                  </label>
                  <input
                    id="groupMaxGap"
                    type="range"
                    min={0}
                    max={GROUP_SLIDER_MAX_MS}
                    step={GROUP_SLIDER_STEP_MS}
                    value={groupMaxGap}
                    onChange={(e) =>
                      applyGroupMaxGap(Number(e.currentTarget.value))
                    }
                  />
                  <input
                    type="number"
                    min={0}
                    step={GROUP_SLIDER_STEP_MS}
                    value={groupMaxGap}
                    onChange={(e) =>
                      applyGroupMaxGap(Number(e.currentTarget.value))
                    }
                  />
                </div>

                <div className="config-row">
                  <label htmlFor="groupMaxDuration">
                    groupMaxDuration
                    <span className="config-value">
                      {groupMaxDuration === undefined
                        ? "unlimited"
                        : formatMs(groupMaxDuration)}
                    </span>
                  </label>
                  <input
                    id="groupMaxDuration"
                    type="range"
                    min={0}
                    max={GROUP_SLIDER_MAX_MS}
                    step={GROUP_SLIDER_STEP_MS}
                    disabled={groupMaxDuration === undefined}
                    value={groupMaxDuration ?? 0}
                    onChange={(e) =>
                      applyGroupMaxDuration(Number(e.currentTarget.value))
                    }
                  />
                  <input
                    type="number"
                    min={0}
                    step={GROUP_SLIDER_STEP_MS}
                    disabled={groupMaxDuration === undefined}
                    value={groupMaxDuration ?? 0}
                    onChange={(e) =>
                      applyGroupMaxDuration(Number(e.currentTarget.value))
                    }
                  />
                  <label className="config-unlimited">
                    <input
                      type="checkbox"
                      checked={groupMaxDuration === undefined}
                      onChange={(e) =>
                        applyGroupMaxDuration(
                          e.currentTarget.checked ? undefined : 60000,
                        )
                      }
                    />
                    unlimited
                  </label>
                </div>
              </div>
            )}

            <button
              className="config-gear-button"
              aria-label="Configuration"
              aria-expanded={showSettings}
              onClick={() => setShowSettings((s) => !s)}
            >
              ⚙
            </button>
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
