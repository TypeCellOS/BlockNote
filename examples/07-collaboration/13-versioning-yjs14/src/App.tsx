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

const DAY_MS = 24 * 60 * 60 * 1000;

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
  // Open already well-grouped (~one row per version) so the history reads as a
  // short, understandable list; dragging groupMaxGap down explodes it.
  groupMaxGap: 1 * DAY_MS,
  groupMaxDuration: undefined as number | undefined,
  // Whether adjacent edits by *different* users merge into one entry.
  mergeUsers: true,
};
const versioningEndpoints = createYHubVersioningEndpoints(versioningOptions);

// Common "nice" gap values spanning 30 seconds → 1 week, offered as a dropdown.
// The seeded history spans a few weeks with inter-edit gaps skewed toward hours
// and days (see snapshotBuilder), so this ladder of values lets each choice
// meaningfully re-shape the list: the hour values pull apart within-version
// edits, the day values collapse whole versions. A dropdown (vs. a slider) makes
// the exact value obvious and picking a specific one a single click.
const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const GROUP_GAP_STOPS = [
  30 * SECOND_MS,
  1 * MINUTE_MS,
  2 * MINUTE_MS,
  5 * MINUTE_MS,
  10 * MINUTE_MS,
  15 * MINUTE_MS,
  30 * MINUTE_MS,
  1 * HOUR_MS,
  2 * HOUR_MS,
  4 * HOUR_MS,
  6 * HOUR_MS,
  12 * HOUR_MS,
  1 * DAY_MS,
  2 * DAY_MS,
  3 * DAY_MS,
  5 * DAY_MS,
  7 * DAY_MS,
];

/** The stop value nearest to `ms` (for snapping an arbitrary value to an option). */
const nearestStop = (ms: number) =>
  GROUP_GAP_STOPS.reduce((best, stop) =>
    Math.abs(stop - ms) < Math.abs(best - ms) ? stop : best,
  );

const formatMs = (ms: number) => {
  if (ms >= DAY_MS) {
    const days = ms / DAY_MS;
    return `${days.toFixed(days % 1 === 0 ? 0 : 1)}d`;
  }
  if (ms >= HOUR_MS) {
    const hours = ms / HOUR_MS;
    return `${hours.toFixed(hours % 1 === 0 ? 0 : 1)}h`;
  }
  if (ms >= MINUTE_MS) {
    const mins = ms / MINUTE_MS;
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

  // Local mirror of the grouping knobs. Changing any writes the value back onto
  // the shared `versioningOptions` object and re-runs `list()` so the history
  // sidebar re-groups immediately (the core `list()` reads these live).
  const [showSettings, setShowSettings] = useState(false);
  const [groupMaxGap, setGroupMaxGap] = useState(versioningOptions.groupMaxGap);
  const [groupMaxDuration, setGroupMaxDuration] = useState(
    versioningOptions.groupMaxDuration,
  );
  const [mergeUsers, setMergeUsers] = useState(versioningOptions.mergeUsers);

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

  const applyMergeUsers = (value: boolean) => {
    setMergeUsers(value);
    versioningOptions.mergeUsers = value;
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
                  <label htmlFor="groupMaxGap">groupMaxGap</label>
                  {/* A dropdown of common gap values (30s → 1week). Pick one and
                      the history re-groups against the live document. */}
                  <select
                    id="groupMaxGap"
                    className="config-select"
                    value={nearestStop(groupMaxGap)}
                    onChange={(e) =>
                      applyGroupMaxGap(Number(e.currentTarget.value))
                    }
                  >
                    {GROUP_GAP_STOPS.map((ms) => (
                      <option key={ms} value={ms}>
                        {formatMs(ms)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="config-row">
                  <label htmlFor="groupMaxDuration">groupMaxDuration</label>
                  <select
                    id="groupMaxDuration"
                    className="config-select"
                    value={
                      groupMaxDuration === undefined
                        ? "unlimited"
                        : nearestStop(groupMaxDuration)
                    }
                    onChange={(e) => {
                      const v = e.currentTarget.value;
                      applyGroupMaxDuration(
                        v === "unlimited" ? undefined : Number(v),
                      );
                    }}
                  >
                    <option value="unlimited">unlimited</option>
                    {GROUP_GAP_STOPS.map((ms) => (
                      <option key={ms} value={ms}>
                        {formatMs(ms)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="config-row">
                  <label className="config-toggle">
                    <input
                      type="checkbox"
                      checked={mergeUsers ?? false}
                      onChange={(e) => applyMergeUsers(e.currentTarget.checked)}
                    />
                    <span className="config-value">
                      merge edits across users
                    </span>
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
