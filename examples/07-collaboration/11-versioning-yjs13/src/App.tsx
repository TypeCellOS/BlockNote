import "@blocknote/core/fonts/inter.css";
import { withCollaboration } from "@blocknote/core/yjs";
import { VersioningExtension } from "@blocknote/core/extensions";
import { createYjsVersioningAdapter } from "@blocknote/core/yjs";
import {
  hasStoredVersions,
  localStorageEndpoints,
  storeVersions,
} from "./localStorageEndpoints";
import { BlockNoteViewEditor, useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useState } from "react";

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { toBase64, fromBase64 } from "lib0/buffer";

import { VersionHistorySidebar } from "./VersionHistorySidebar";
import {
  blocksToUpdate,
  DAY_MS,
  LIVE_DOCUMENT,
  SAMPLE_HISTORY,
} from "./sampleVersions";
import "./style.css";

const roomName = "blocknote-versioning-yjs-example";
const FRAGMENT_NAME = "document-store";
// localStorage key for the live ("current version") document. Snapshots are
// persisted separately by `localStorageEndpoints`; this keeps the live doc
// itself across refreshes since the demo has no server-side persistence.
const DOC_STORAGE_KEY = "blocknote-versioning-yjs-current-doc";
const doc = new Y.Doc();
const fragment = doc.getXmlFragment(FRAGMENT_NAME);

// Persist the full document state on every change.
doc.on("update", () => {
  localStorage.setItem(DOC_STORAGE_KEY, toBase64(Y.encodeStateAsUpdate(doc)));
});

// Restore the persisted live document before the editor is created, so it
// adopts the stored content instead of starting empty.
const persistedDoc = localStorage.getItem(DOC_STORAGE_KEY);
if (persistedDoc) {
  Y.applyUpdate(doc, fromBase64(persistedDoc));
} else if (!hasStoredVersions()) {
  // First visit: seed a few named versions so the history has something to
  // show, and open on the newest state of the same document.
  storeVersions(
    SAMPLE_HISTORY.map((version) => ({
      name: version.name,
      createdAt: Date.now() - version.daysAgo * DAY_MS,
      content: blocksToUpdate(version.blocks, FRAGMENT_NAME),
    })),
  );
  Y.applyUpdate(doc, blocksToUpdate(LIVE_DOCUMENT, FRAGMENT_NAME));
}

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
        user: { color: "#ff0000", name: "User", id: "user" },
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

  const [showSidebar, setShowSidebar] = useState(true);

  return (
    <div className="wrapper">
      {/* No `editable` prop: the sidebar makes the editor read-only for as long
          as it's open, and restores it on close. */}
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
            <VersionHistorySidebar onClose={() => setShowSidebar(false)} />
          )}
        </div>
      </BlockNoteView>
    </div>
  );
}
