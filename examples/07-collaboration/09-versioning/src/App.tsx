import "@blocknote/core/fonts/inter.css";
import {
  localStorageEndpoints,
  SuggestionsExtension,
  VersioningExtension,
} from "@blocknote/core/extensions";
import {
  BlockNoteViewEditor,
  FloatingComposerController,
  useCreateBlockNote,
  useEditorState,
  useExtension,
  useExtensionState,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useEffect, useMemo, useState } from "react";
import { RiChat3Line, RiHistoryLine } from "react-icons/ri";
import * as Y from "@y/y";
import { Awareness } from "@y/protocols/awareness";
import { WebsocketProvider } from "@y/websocket";

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
import { SuggestionActions } from "./SuggestionActions";
import { SuggestionActionsPopup } from "./SuggestionActionsPopup";

const roomName = "blocknote-versioning-example";
const doc = new Y.Doc();
const provider = new WebsocketProvider(
  "wss://demos.yjs.dev/ws",
  roomName,
  doc,
  { connect: false },
);
provider.connectBc();

const suggestionModeDoc = new Y.Doc({ isSuggestionDoc: true });
const suggestionModeProvider = new WebsocketProvider(
  "wss://demos.yjs.dev/ws",
  roomName + "-suggestions",
  suggestionModeDoc,
  { connect: false },
);
const suggestionModeAttributionManager = Y.createAttributionManagerFromDiff(
  doc,
  suggestionModeDoc,
  { attrs: [Y.createAttributionItem("insert", ["nickthesick"])] },
);
suggestionModeProvider.connectBc();

async function resolveUsers(userIds: string[]) {
  // fake a (slow) network request
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return HARDCODED_USERS.filter((user) => userIds.includes(user.id));
}

export default function App() {
  const [activeUser, setActiveUser] = useState<MyUserType>(HARDCODED_USERS[0]);

  const threadStore = useMemo(() => {
    return new YjsThreadStore(
      activeUser.id,
      doc.getMap("threads"),
      new DefaultThreadStoreAuth(activeUser.id, activeUser.role),
    );
  }, [doc, activeUser]);

  const editor = useCreateBlockNote({
    collaboration: {
      provider,
      suggestionDoc: suggestionModeDoc,
      attributionManager: suggestionModeAttributionManager,
      fragment: doc.getXmlFragment(),
      user: { color: getRandomColor(), name: activeUser.username },
    },
    extensions: [
      CommentsExtension({ threadStore, resolveUsers }),
      SuggestionsExtension(),
      VersioningExtension({
        endpoints: localStorageEndpoints,
        fragment: doc.getXmlFragment(),
      }),
    ],
  });

  const {
    enableSuggestions,
    disableSuggestions,
    showSuggestions,
    checkUnresolvedSuggestions,
  } = useExtension(SuggestionsExtension, { editor });
  const hasUnresolvedSuggestions = useEditorState({
    selector: () => checkUnresolvedSuggestions(),
    editor,
  });

  const { selectSnapshot } = useExtension(VersioningExtension, { editor });
  const { selectedSnapshotId } = useExtensionState(VersioningExtension, {
    editor,
  });

  const [editingMode, setEditingMode] = useState<
    "editing" | "suggestions" | "view-suggestions"
  >("editing");
  useEffect(() => {
    if (editingMode !== "editing") {
      disableSuggestions();
      setEditingMode("editing");
    }
  }, [selectedSnapshotId]);
  const [sidebar, setSidebar] = useState<
    "comments" | "versionHistory" | "none"
  >("none");

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
                {activeUser.role === "editor" && (
                  <SettingsSelect
                    label={"Mode"}
                    items={[
                      {
                        text: "Editing",
                        icon: null,
                        onClick: () => {
                          disableSuggestions();
                          setEditingMode("editing");
                        },
                        isSelected: editingMode === "editing",
                      },
                      {
                        text: "Editing + Viewing Suggestions",
                        icon: null,
                        onClick: () => {
                          showSuggestions();
                          setEditingMode("view-suggestions");
                        },
                        isSelected: editingMode === "view-suggestions",
                      },
                      {
                        text: "Suggesting",
                        icon: null,
                        onClick: () => {
                          enableSuggestions();
                          setEditingMode("suggestions");
                        },
                        isSelected: editingMode === "suggestions",
                      },
                    ]}
                  />
                )}
                {activeUser.role === "editor" &&
                  editingMode === "suggestions" &&
                  hasUnresolvedSuggestions && <SuggestionActions />}
              </div>
            )}
            {/* Because we set `renderEditor` to false, we can now manually place
            `BlockNoteViewEditor` (the actual editor component) in its own
            section below the user settings select. */}
            <BlockNoteViewEditor />
            <SuggestionActionsPopup />
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
