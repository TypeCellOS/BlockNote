import "@blocknote/core/fonts/inter.css";
import { withCollaboration } from "@blocknote/core/yjs";
import { VersioningExtension } from "@blocknote/core/extensions";
import { createYjsVersioningAdapter } from "@blocknote/core/yjs";
import { localStorageEndpoints } from "./localStorageEndpoints";
import {
  BlockNoteViewEditor,
  useCreateBlockNote,
  useExtensionState,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";

import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { toBase64, fromBase64 } from "lib0/buffer";

import { VersionHistorySidebar } from "./VersionHistorySidebar";
import "./style.css";

const roomName = "blocknote-versioning-yjs-example";
// localStorage key for the live ("current version") document. Snapshots are
// persisted separately by `localStorageEndpoints`; this keeps the live doc
// itself across refreshes since the demo has no server-side persistence.
const DOC_STORAGE_KEY = "blocknote-versioning-yjs-current-doc";
const doc = new Y.Doc();
const fragment = doc.getXmlFragment("document-store");

// Restore the persisted live document before the editor is created, so it
// adopts the stored content instead of starting empty.
const persistedDoc = localStorage.getItem(DOC_STORAGE_KEY);
if (persistedDoc) {
  Y.applyUpdate(doc, fromBase64(persistedDoc));
}

// Persist the full document state on every change.
doc.on("update", () => {
  localStorage.setItem(DOC_STORAGE_KEY, toBase64(Y.encodeStateAsUpdate(doc)));
});

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
