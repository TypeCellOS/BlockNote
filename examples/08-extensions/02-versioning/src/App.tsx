import "@blocknote/core/fonts/inter.css";
import {
  VersioningExtension,
  createInMemoryVersioningAdapter,
} from "@blocknote/core/extensions";
import { DiffVersioningExtension } from "@blocknote/core/y";
import {
  BlockNoteViewEditor,
  useCreateBlockNote,
  useExtensionState,
  VersioningSidebar,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useState } from "react";

import "./style.css";

export default function App() {
  // `createInMemoryVersioningAdapter` is passed as a factory function. The
  // VersioningExtension will call it with the editor instance once it's ready.
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "heading",
        content: "In-Memory Versioning Example",
        props: { level: 2 },
      },
      {
        type: "paragraph",
        content:
          "This example demonstrates versioning without any collaboration layer. " +
          "Snapshots are stored in memory using ProseMirror JSON — no Yjs required.",
      },
      {
        type: "paragraph",
        content:
          "Try editing this document, then use the Version History sidebar to " +
          "save snapshots. You can preview and restore older versions.",
      },
    ],
    extensions: [
      VersioningExtension(createInMemoryVersioningAdapter),
      // Opt into rendering version diffs: when comparing two versions the
      // sidebar shows insertions/deletions as attributed marks. Without this
      // extension the in-memory versioning falls back to a plain document swap.
      DiffVersioningExtension(),
    ],
  });

  const { previewedSnapshotId } = useExtensionState(VersioningExtension, {
    editor,
  });

  const [showSidebar, setShowSidebar] = useState(true);

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
