import { RenderInPortalElement, useCreateBlockNote } from "@blocknote/react";
import "@blocknote/core/fonts/inter.css";
import {
  InMemoryVersioningExtension,
  type LocalVersioningOptions,
  type VersioningController,
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

const historyOptions: LocalVersioningOptions = {
  initialVersions: SAMPLE_HISTORY.map((version) => ({
    name: version.name,
    createdAt: Date.now() - version.daysAgo * DAY_MS,
    // These samples have flat blocks with plain text. ProseMirror JSON wraps
    // each block in a blockContainer, inside the document's blockGroup.
    content: {
      type: "doc",
      content: [
        {
          type: "blockGroup",
          content: version.blocks.map((block) => ({
            type: "blockContainer",
            attrs: { id: block.id },
            content: [
              {
                type: block.type,
                attrs: block.props,
                content: block.content
                  ? [{ type: "text", text: block.content }]
                  : [],
              },
            ],
          })),
        },
      ],
    },
  })),
};

export default function App() {
  // Each editor owns its history, seeded here with a few saved documents.
  const editor = useCreateBlockNote({
    initialContent: LIVE_DOCUMENT,
    extensions: [
      InMemoryVersioningExtension(historyOptions),
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
      <BlockNoteView editor={editor}>
        {!showSidebar && (
          <button
            className="show-history-button"
            onClick={() => {
              editor.getExtension<VersioningController>("versioning")!.open();
              setShowSidebar(true);
            }}
          >
            History
          </button>
        )}
        {showSidebar && sidebarPanel && (
          <RenderInPortalElement target={sidebarPanel}>
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
          </RenderInPortalElement>
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
