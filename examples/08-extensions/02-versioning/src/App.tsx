import {
  BlockNotePortal,
  BlockNoteViewEditor,
  useCreateBlockNote,
} from "@blocknote/react";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteEditor } from "@blocknote/core";
import {
  VersioningExtension,
  createInMemoryVersioningAdapter,
} from "@blocknote/core/extensions";
import { DiffVersioningExtension } from "@blocknote/core/y";
import {
  DefaultVersionMenuItems,
  useVersionSnapshot,
  VersionMenu,
  VersionMenuItem,
  VersioningSidebar,
} from "@blocknote/react/versioning";
import { RiFileCopyLine } from "react-icons/ri";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useState } from "react";

import { DAY_MS, LIVE_DOCUMENT, SAMPLE_HISTORY } from "./sampleVersions";
import "./style.css";

export default function App() {
  // The adapter is created per editor, so it's passed as a factory: the
  // VersioningExtension calls it with the editor instance once that's ready.
  // The store starts out with a few versions, the way an application would
  // load the history it persisted.
  const editor = useCreateBlockNote({
    initialContent: LIVE_DOCUMENT,
    extensions: [
      VersioningExtension((editor) =>
        createInMemoryVersioningAdapter(editor, {
          initialVersions: SAMPLE_HISTORY.map((version) => ({
            name: version.name,
            createdAt: Date.now() - version.daysAgo * DAY_MS,
            // The store keeps `Block[]`; a headless editor fills in the block
            // defaults the sample leaves out.
            content: BlockNoteEditor.create({ initialContent: version.blocks })
              .document,
          })),
        }),
      ),
      // Opt into rendering version diffs: when comparing two versions the
      // sidebar shows insertions/deletions as attributed marks. Without this
      // extension the in-memory versioning falls back to a plain document swap.
      DiffVersioningExtension(),
    ],
  });

  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarPanel, setSidebarPanel] = useState<HTMLDivElement | null>(null);

  return (
    <div className="wrapper layout">
      {/* No `editable` prop: the sidebar makes the editor read-only for as
          long as it's open, and restores it on close. */}
      <BlockNoteView
        editor={editor}
        renderEditor={false}
        className="editor-panel"
      >
        <BlockNoteViewEditor />
        {!showSidebar && (
          <button
            className="show-history-button"
            onClick={() => setShowSidebar(true)}
          >
            History
          </button>
        )}
        {showSidebar && sidebarPanel && (
          <BlockNotePortal target={sidebarPanel}>
            <VersioningSidebar
              onClose={() => setShowSidebar(false)}
              // Extend the row menu by composing it: the default items plus
              // an app-specific one. Order is yours to choose.
              snapshotMenu={
                <VersionMenu>
                  <DefaultVersionMenuItems />
                  <MakeCopyItem />
                </VersionMenu>
              }
            />
          </BlockNotePortal>
        )}
      </BlockNoteView>
      {showSidebar && <div className="sidebar-section" ref={setSidebarPanel} />}
    </div>
  );
}

/**
 * An application-specific row action. `useVersionSnapshot()` hands it the row
 * it was rendered in, so it needs no props — the sidebar knows nothing about it.
 */
function MakeCopyItem() {
  const { snapshot, isCurrent } = useVersionSnapshot();

  return (
    <VersionMenuItem
      icon={<RiFileCopyLine />}
      onClick={() => {
        window.alert(
          `Would copy ${isCurrent ? "the current version" : (snapshot.name ?? new Date(snapshot.createdAt).toLocaleString())} into a new document.`,
        );
      }}
    >
      Make a copy
    </VersionMenuItem>
  );
}
