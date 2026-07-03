import "@blocknote/core/fonts/inter.css";
import {
  VersioningExtension,
  createInMemoryVersioningAdapter,
} from "@blocknote/core/extensions";
import { DiffVersioningExtension } from "@blocknote/core/y";
import {
  BlockNoteViewEditor,
  useCreateBlockNote,
  useExtension,
  useExtensionState,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useState } from "react";
import { RiHistoryLine } from "react-icons/ri";

import { VersionHistorySidebar } from "./VersionHistorySidebar";
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
          "Try editing this document, then open the Version History sidebar to " +
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

  const { exitPreview } = useExtension(VersioningExtension, { editor });
  const { previewedSnapshotId } = useExtensionState(VersioningExtension, {
    editor,
  });

  const [sidebar, setSidebar] = useState<"versionHistory" | "none">("none");

  return (
    <div className="versioning-example">
      <BlockNoteView
        editor={editor}
        editable={
          sidebar !== "versionHistory" || previewedSnapshotId === undefined
        }
        renderEditor={false}
      >
        <div className="main-container">
          <div className={"editor-layout-wrapper"}>
            <div className="sidebar-selectors">
              <div
                className={`sidebar-selector ${sidebar === "versionHistory" ? "selected" : ""}`}
                onClick={() => {
                  setSidebar((s) =>
                    s !== "versionHistory" ? "versionHistory" : "none",
                  );
                  exitPreview();
                }}
              >
                <RiHistoryLine />
                <span>Version History</span>
              </div>
            </div>
            <div className={"editor-section"}>
              <BlockNoteViewEditor />
            </div>
          </div>
          {sidebar === "versionHistory" && <VersionHistorySidebar />}
        </div>
      </BlockNoteView>
    </div>
  );
}
