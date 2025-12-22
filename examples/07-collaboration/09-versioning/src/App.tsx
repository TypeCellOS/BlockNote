import "@blocknote/core/fonts/inter.css";
import {
  localStorageEndpoints,
  VersioningExtension,
} from "@blocknote/core/extensions";
import {
  BlockNoteViewEditor,
  FloatingComposerController,
  useCreateBlockNote,
  useExtension,
  useExtensionState,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useMemo, useState } from "react";
import { RiChat3Line, RiHistoryLine } from "react-icons/ri";
import * as Y from "yjs";

import { getRandomColor, HARDCODED_USERS, MyUserType } from "./userdata";
import { SettingsSelect } from "./SettingsSelect";
import "./style.css";
import {
  YjsThreadStore,
  DefaultThreadStoreAuth,
  CommentsExtension,
} from "@blocknote/core/comments";

import { CommentsSidebar } from "./CommentsSidebar";
import { VersionHistorySidebar } from "./VersionHistorySidebar";

const doc = new Y.Doc();

async function resolveUsers(userIds: string[]) {
  // fake a (slow) network request
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return HARDCODED_USERS.filter((user) => userIds.includes(user.id));
}

export default function App() {
  const [activeUser, setActiveUser] = useState<MyUserType>(HARDCODED_USERS[0]);
  const [editingMode, setEditingMode] = useState<"editing" | "suggestions">(
    "editing",
  );
  const [sidebar, setSidebar] = useState<
    "comments" | "versionHistory" | "none"
  >("none");

  const threadStore = useMemo(() => {
    return new YjsThreadStore(
      activeUser.id,
      doc.getMap("threads"),
      new DefaultThreadStoreAuth(activeUser.id, activeUser.role),
    );
  }, [doc, activeUser]);

  const editor = useCreateBlockNote({
    collaboration: {
      fragment: doc.getXmlFragment(),
      user: { color: getRandomColor(), name: activeUser.username },
    },
    extensions: [
      CommentsExtension({ threadStore, resolveUsers }),
      VersioningExtension({
        endpoints: localStorageEndpoints,
        fragment: doc.getXmlFragment(),
      }),
    ],
  });

  const { selectSnapshot } = useExtension(VersioningExtension, { editor });
  const { selectedSnapshotId } = useExtensionState(VersioningExtension, {
    editor,
  });

  return (
    <BlockNoteView
      className={"full-collaboration"}
      editor={editor}
      editable={
        (sidebar !== "versionHistory" || selectedSnapshotId === undefined) &&
        activeUser.role === "editor"
      }
      // In other examples, `BlockNoteView` renders both editor element itself,
      // and the container element which contains the necessary context for
      // BlockNote UI components. However, in this example, we want more control
      // over the rendering of the editor, so we set `renderEditor` to `false`.
      // Now, `BlockNoteView` will only render the container element, and we can
      // render the editor element anywhere we want using `BlockNoteEditorView`.
      renderEditor={false}
      // We also disable the default rendering of comments in the editor, as we
      // want to render them in the `ThreadsSidebar` component instead.
      comments={sidebar !== "comments"}
    >
      <div className="full-collaboration-main-container">
        {/* We place the editor, the sidebar, and any settings selects within
        `BlockNoteView` as they use BlockNote UI components and need the context
        for them. */}
        <div className={"editor-layout-wrapper"}>
          <div className="sidebar-selectors">
            <div
              className={`sidebar-selector ${sidebar === "versionHistory" ? "selected" : ""}`}
              onClick={() => {
                setSidebar((sidebar) =>
                  sidebar !== "versionHistory" ? "versionHistory" : "none",
                );
                selectSnapshot(undefined);
              }}
            >
              <RiHistoryLine />
              <span>Version History</span>
            </div>
            <div
              className={`sidebar-selector ${sidebar === "comments" ? "selected" : ""}`}
              onClick={() =>
                setSidebar((sidebar) =>
                  sidebar !== "comments" ? "comments" : "none",
                )
              }
            >
              <RiChat3Line />
              <span>Comments</span>
            </div>
          </div>
          <div className={"editor-section"}>
            {/* <h1>Editor</h1> */}
            {selectedSnapshotId === undefined && (
              <div className={"settings"}>
                <SettingsSelect
                  label={"User"}
                  items={HARDCODED_USERS.map((user) => ({
                    text: `${user.username} (${
                      user.role === "editor" ? "Editor" : "Commenter"
                    })`,
                    icon: null,
                    onClick: () => {
                      setActiveUser(user);
                    },
                    isSelected: user.id === activeUser.id,
                  }))}
                />
                <SettingsSelect
                  label={"Mode"}
                  items={[
                    {
                      text: "Editing",
                      icon: null,
                      onClick: () => {
                        setEditingMode("editing");
                      },
                      isSelected: editingMode === "editing",
                    },
                    {
                      text: "Suggestions",
                      icon: null,
                      onClick: () => {
                        setEditingMode("suggestions");
                      },
                      isSelected: editingMode === "suggestions",
                    },
                  ]}
                />
              </div>
            )}
            {/* Because we set `renderEditor` to false, we can now manually place
            `BlockNoteViewEditor` (the actual editor component) in its own
            section below the user settings select. */}
            <BlockNoteViewEditor />
            {/* Since we disabled rendering of comments with `comments={false}`,
            we need to re-add the floating composer, which is the UI element that
            appears when creating new threads. */}
            {sidebar === "comments" && <FloatingComposerController />}
          </div>
        </div>
        {sidebar === "comments" && <CommentsSidebar />}
        {sidebar === "versionHistory" && <VersionHistorySidebar />}
      </div>
    </BlockNoteView>
  );
}
