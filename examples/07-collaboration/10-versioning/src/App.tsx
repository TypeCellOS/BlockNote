import "@blocknote/core/fonts/inter.css";
import { withCollaboration, SuggestionsExtension } from "@blocknote/core/y";
import { localStorageEndpoints } from "./localStorageEndpoints.js";
import { VersioningExtension } from "@blocknote/core/extensions";
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
import * as Y from "@y/y";
import { WebsocketProvider } from "@y/websocket";

import { getRandomColor, HARDCODED_USERS, MyUserType } from "./userdata";
import { SettingsSelect } from "./SettingsSelect";
import "./style.css";
import {
  DefaultThreadStoreAuth,
  CommentsExtension,
} from "@blocknote/core/comments";
import { YjsThreadStore } from "@blocknote/core/y";

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
doc.on("update", () => {
  console.log("doc-update", doc.get().toJSON());
});

const suggestionModeDoc = new Y.Doc({ isSuggestionDoc: true });
suggestionModeDoc.on("update", () => {
  console.log("suggestion-update", suggestionModeDoc.get().toJSON());
});
const suggestionModeProvider = new WebsocketProvider(
  "wss://demos.yjs.dev/ws",
  roomName + "-suggestions",
  suggestionModeDoc,
  { connect: false },
);
const suggestionModeAttributionManager = Y.createAttributionManagerFromDiff(
  doc,
  suggestionModeDoc,
  // {
  //   attrs: [
  //     // Y.createAttributionItem("insert", ["John Doe"]),
  //     // Y.createAttributionItem("delete", ["John Doe"]),
  //   ],
  // },
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
      doc.get("threads"),
      new DefaultThreadStoreAuth(activeUser.id, activeUser.role),
    );
  }, [doc, activeUser]);

  const editor = useCreateBlockNote(
    withCollaboration({
      collaboration: {
        provider,
        suggestionDoc: suggestionModeDoc,
        attributionManager: suggestionModeAttributionManager,
        fragment: doc.get(),
        user: { color: getRandomColor(), name: activeUser.username },
        versioningEndpoints: localStorageEndpoints,
      },
      extensions: [CommentsExtension({ threadStore, resolveUsers })],
    }),
  );

  const {
    enableSuggestions,
    disableSuggestions,
    viewSuggestions,
    checkUnresolvedSuggestions,
  } = useExtension(SuggestionsExtension, { editor });
  const hasUnresolvedSuggestions = useEditorState({
    selector: () => checkUnresolvedSuggestions(),
    editor,
  });

  const { previewedSnapshotId } = useExtensionState(VersioningExtension, {
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
  }, [previewedSnapshotId]);
  const [sidebar, setSidebar] = useState<"comments" | "versionHistory">(
    "versionHistory",
  );

  return (
    <div className="wrapper">
      <BlockNoteView
        className={"full-collaboration"}
        editor={editor}
        editable={
          previewedSnapshotId === undefined && activeUser.role === "editor"
        }
        renderEditor={false}
        comments={sidebar !== "comments"}
      >
        <div className="layout">
          <div className="editor-panel">
            {previewedSnapshotId === undefined && (
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
                          viewSuggestions();
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
                <SettingsSelect
                  label={"Sidebar"}
                  items={[
                    {
                      text: "Version History",
                      icon: null,
                      onClick: () => setSidebar("versionHistory"),
                      isSelected: sidebar === "versionHistory",
                    },
                    {
                      text: "Comments",
                      icon: null,
                      onClick: () => setSidebar("comments"),
                      isSelected: sidebar === "comments",
                    },
                  ]}
                />
                {activeUser.role === "editor" &&
                  editingMode === "suggestions" &&
                  hasUnresolvedSuggestions && <SuggestionActions />}
              </div>
            )}
            <BlockNoteViewEditor />
            <SuggestionActionsPopup />
            {sidebar === "comments" && <FloatingComposerController />}
          </div>
          {sidebar === "comments" && <CommentsSidebar />}
          {sidebar === "versionHistory" && <VersionHistorySidebar />}
        </div>
      </BlockNoteView>
    </div>
  );
}
