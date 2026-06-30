import "@blocknote/core/fonts/inter.css";
import {
  withCollaboration,
  SuggestionsExtension,
  createYHubVersioningEndpoints,
} from "@blocknote/core/y";
import {
  UserExtension,
  VersioningExtension,
  type User,
} from "@blocknote/core/extensions";
import {
  BlockNoteViewEditor,
  useCreateBlockNote,
  useExtension,
  useExtensionState,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useEffect, useMemo, useRef, useState } from "react";
import * as Y from "@y/y";
import { fromBase64 } from "lib0/buffer";
import { WebsocketProvider } from "@y/websocket";

import { resolveUsers } from "./userdata.js";

import { HistorySidebar } from "./HistorySidebar.js";

/**
 * DocumentEditor mounts one collaborative editor at a time, keyed by docId.
 * Switching documents unmounts + remounts this component (via `key` in App).
 */
export function DocumentEditor({
  workspaceId,
  docId,
  user,
  docTitle,
  onTouch,
}: {
  workspaceId: string;
  docId: string;
  user: User;
  docTitle: string;
  onTouch: () => void;
}) {
  const roomName = `${workspaceId}/${docId}`;

  // Stable refs for Y.js resources that persist for this mount
  const resourcesRef = useRef<{
    doc: Y.Doc;
    suggestionDoc: Y.Doc;
    provider: WebsocketProvider;
    suggestionProvider: WebsocketProvider;
    attributionManager: ReturnType<typeof Y.createAttributionManagerFromDiff>;
    versioningEndpoints: ReturnType<typeof createYHubVersioningEndpoints>;
  } | null>(null);

  if (!resourcesRef.current) {
    const doc = new Y.Doc();

    // Apply pre-seeded document state if available (one-time)
    const docStateKey = `bn-doc-state-${docId}`;
    const savedState = localStorage.getItem(docStateKey);
    if (savedState) {
      Y.applyUpdateV2(doc, fromBase64(savedState));
      localStorage.removeItem(docStateKey);
    }

    const suggestionDoc = new Y.Doc({ isSuggestionDoc: true });
    const yhubHost = "yhub.teleportal.tools";

    const provider = new WebsocketProvider(
      `wss://${yhubHost}/ws`,
      roomName,
      doc,
      {
        params: {
          userid: user.id,
        },
      },
    );
    const suggestionProvider = new WebsocketProvider(
      `wss://${yhubHost}/ws`,
      roomName + "-suggestions",
      suggestionDoc,
      {
        params: {
          userid: user.id,
        },
      },
    );
    const attributionManager = Y.createAttributionManagerFromDiff(
      doc,
      suggestionDoc,
    );

    const versioningEndpoints = createYHubVersioningEndpoints({
      baseUrl: `https://${yhubHost}`,
      org: workspaceId,
      docId,
    });

    resourcesRef.current = {
      doc,
      suggestionDoc,
      provider,
      suggestionProvider,
      attributionManager,
      versioningEndpoints,
    };
  }

  const {
    doc,
    suggestionDoc,
    provider,
    suggestionProvider,
    attributionManager,
    versioningEndpoints,
  } = resourcesRef.current;

  // Clean up on unmount
  useEffect(() => {
    return () => {
      provider.destroy();
      suggestionProvider.destroy();
      doc.destroy();
      suggestionDoc.destroy();
    };
  }, []);

  // Throttled touch callback for updatedAt
  const touchRef = useRef(onTouch);
  touchRef.current = onTouch;
  const lastTouchRef = useRef(0);

  useEffect(() => {
    const scheduleTouch = () => {
      const now = Date.now();
      if (now - lastTouchRef.current >= 5000) {
        lastTouchRef.current = now;
        touchRef.current();
      }
    };
    const onUpdate = (
      _u: Uint8Array,
      _origin: unknown,
      _doc: Y.Doc,
      tr: { local: boolean },
    ) => {
      if (tr.local) {
        scheduleTouch();
      }
    };
    doc.on("update", onUpdate);
    return () => {
      doc.off("update", onUpdate);
    };
  }, [doc]);

  // Connection status tracking
  const [connStatus, setConnStatus] = useState<string>("connecting");
  useEffect(() => {
    const onStatus = (e: { status: string }) => setConnStatus(e.status);
    provider.on("status", onStatus);
    if (provider.wsconnected) {
      setConnStatus("connected");
    }
    return () => {
      provider.off("status", onStatus);
    };
  }, [provider]);

  const editor = useCreateBlockNote(
    withCollaboration({
      collaboration: {
        provider,
        suggestionDoc,
        attributionManager,
        fragment: doc.get(),
        user: {
          color: user.color ?? "#000000",
          name: user.username,
          id: user.id,
        },
        versioningEndpoints,
      },
      // Resolves version-author ids (YHub's `by`) to usernames in the history
      // sidebar and diff tooltips.
      extensions: [UserExtension({ resolveUsers })],
    }),
  );

  // The version history is derived entirely from YHub's activity timeline.
  // Fetch it once on mount so the sidebar reflects the server's history rather
  // than only changes made during this session.
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

  const { previewedSnapshotId } = useExtensionState(VersioningExtension, {
    editor,
  });

  const { enableSuggestions, disableSuggestions, viewSuggestions } =
    useExtension(SuggestionsExtension, { editor });

  const [editingMode, setEditingMode] = useState<
    "editing" | "suggestions" | "view-suggestions"
  >("editing");

  // Exit suggestion modes when entering version preview
  useEffect(() => {
    if (previewedSnapshotId !== undefined && editingMode !== "editing") {
      disableSuggestions();
      setEditingMode("editing");
    }
  }, [previewedSnapshotId]);

  const modeOptions = useMemo(
    () => [
      { value: "editing" as const, label: "Editing" },
      { value: "view-suggestions" as const, label: "Viewing Suggestions" },
      { value: "suggestions" as const, label: "Suggesting" },
    ],
    [],
  );

  const [showSidebar, setShowSidebar] = useState(true);

  const changeMode = (next: typeof editingMode) => {
    if (next === editingMode) {
      return;
    }
    if (next === "editing") {
      disableSuggestions();
    } else if (next === "view-suggestions") {
      viewSuggestions();
    } else if (next === "suggestions") {
      enableSuggestions();
    }
    setEditingMode(next);
  };

  return (
    <BlockNoteView
      editor={editor}
      editable={previewedSnapshotId === undefined}
      renderEditor={false}
    >
      <div
        className={
          "doc-workspace" + (showSidebar ? "" : " doc-workspace-no-sidebar")
        }
      >
        <section className="doc-main">
          <header className="doc-main-header">
            <div className="doc-main-title-row">
              <h2 className="doc-main-title">{docTitle || "Untitled"}</h2>
              <div className="doc-main-controls">
                {previewedSnapshotId === undefined && (
                  <select
                    className="mode-select"
                    value={editingMode}
                    onChange={(e) =>
                      changeMode(e.target.value as typeof editingMode)
                    }
                    aria-label="Editor mode"
                  >
                    {modeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
                <span className={"doc-status doc-status-" + connStatus}>
                  {connStatus}
                </span>
                {!showSidebar && (
                  <button
                    className="show-history-button"
                    onClick={() => setShowSidebar(true)}
                    title="Show version history"
                    aria-label="Show version history"
                  >
                    History
                  </button>
                )}
              </div>
            </div>
          </header>
          <div className="doc-main-editor">
            <BlockNoteViewEditor />
          </div>
        </section>
        {showSidebar && (
          <HistorySidebar onClose={() => setShowSidebar(false)} />
        )}
      </div>
    </BlockNoteView>
  );
}
