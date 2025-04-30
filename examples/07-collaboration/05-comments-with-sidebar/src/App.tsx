"use client";

import {
  DefaultThreadStoreAuth,
  YjsThreadStore,
} from "@blocknote/core/comments";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  BlockNoteViewEditor,
  FloatingComposerController,
  ThreadsSidebar,
  useCreateBlockNote,
} from "@blocknote/react";
import { YDocProvider, useYDoc, useYjsProvider } from "@y-sweet/react";
import { useMemo, useState } from "react";

import { SettingsSelect } from "./SettingsSelect.js";
import { HARDCODED_USERS, MyUserType, getRandomColor } from "./userdata.js";

import "./style.css";

// The resolveUsers function fetches information about your users
// (e.g. their name, avatar, etc.). Usually, you'd fetch this from your
// own database or user management system.
// Here, we just return the hardcoded users (from userdata.ts)
async function resolveUsers(userIds: string[]) {
  // fake a (slow) network request
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return HARDCODED_USERS.filter((user) => userIds.includes(user.id));
}

// This follows the Y-Sweet example to setup a collabotive editor
// (but of course, you also use other collaboration providers
// see the docs for more information)
export default function App() {
  const docId = "my-blocknote-document-with-comments-2";

  return (
    <YDocProvider
      docId={docId}
      authEndpoint="https://demos.y-sweet.dev/api/auth">
      <Document />
    </YDocProvider>
  );
}

function Document() {
  const [activeUser, setActiveUser] = useState<MyUserType>(HARDCODED_USERS[0]);
  const [commentFilter, setCommentFilter] = useState<
    "open" | "resolved" | "all"
  >("open");
  const [commentSort, setCommentSort] = useState<
    "position" | "recent-activity" | "oldest"
  >("position");

  const provider = useYjsProvider();

  // take the Y.Doc collaborative document from Y-Sweet
  const doc = useYDoc();

  // setup the thread store which stores / and syncs thread / comment data
  const threadStore = useMemo(() => {
    // (alternative, use TiptapCollabProvider)
    // const provider = new TiptapCollabProvider({
    //   name: "test",
    //   baseUrl: "https://collab.yourdomain.com",
    //   appId: "test",
    //   document: doc,
    // });
    // return new TiptapThreadStore(
    //   activeUser.id,
    //   provider,
    //   new DefaultThreadStoreAuth(activeUser.id, activeUser.role)
    // );
    return new YjsThreadStore(
      activeUser.id,
      doc.getMap("threads"),
      new DefaultThreadStoreAuth(activeUser.id, activeUser.role)
    );
  }, [doc, activeUser]);

  // setup the editor with comments and collaboration
  const editor = useCreateBlockNote(
    {
      resolveUsers,
      comments: {
        threadStore,
      },
      collaboration: {
        provider,
        fragment: doc.getXmlFragment("blocknote"),
        user: { color: getRandomColor(), name: activeUser.username },
      },
    },
    [activeUser, threadStore]
  );

  return (
    <BlockNoteView
      className={"sidebar-comments-main-container"}
      editor={editor}
      editable={activeUser.role === "editor"}
      // In other examples, `BlockNoteView` renders both editor element itself,
      // and the container element which contains the necessary context for
      // BlockNote UI components. However, in this example, we want more control
      // over the rendering of the editor, so we set `renderEditor` to `false`.
      // Now, `BlockNoteView` will only render the container element, and we can
      // render the editor element anywhere we want using `BlockNoteEditorView`.
      renderEditor={false}
      // We also disable the default rendering of comments in the editor, as we
      // want to render them in the `ThreadsSidebar` component instead.
      comments={false}>
      {/* We place the editor, the sidebar, and any settings selects within
      `BlockNoteView` as they use BlockNote UI components and need the context
      for them. */}
      <div className={"editor-layout-wrapper"}>
        <div className={"editor-section"}>
          <h1>Editor</h1>
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
          </div>
          {/* Because we set `renderEditor` to false, we can now manually place
          `BlockNoteViewEditor` (the actual editor component) in its own
          section below the user settings select. */}
          <BlockNoteViewEditor />
          {/* Since we disabled rendering of comments with `comments={false}`,
          we need to re-add the floating composer, which is the UI element that
          appears when creating new threads. */}
          <FloatingComposerController />
        </div>
      </div>
      {/* We also place the `ThreadsSidebar` component in its own section,
      along with settings for filtering and sorting. */}
      <div className={"threads-sidebar-section"}>
        <h1>Comments</h1>
        <div className={"settings"}>
          <SettingsSelect
            label={"Filter"}
            items={[
              {
                text: "All",
                icon: null,
                onClick: () => setCommentFilter("all"),
                isSelected: commentFilter === "all",
              },
              {
                text: "Open",
                icon: null,
                onClick: () => setCommentFilter("open"),
                isSelected: commentFilter === "open",
              },
              {
                text: "Resolved",
                icon: null,
                onClick: () => setCommentFilter("resolved"),
                isSelected: commentFilter === "resolved",
              },
            ]}
          />
          <SettingsSelect
            label={"Sort"}
            items={[
              {
                text: "Position",
                icon: null,
                onClick: () => setCommentSort("position"),
                isSelected: commentSort === "position",
              },
              {
                text: "Recent activity",
                icon: null,
                onClick: () => setCommentSort("recent-activity"),
                isSelected: commentSort === "recent-activity",
              },
              {
                text: "Oldest",
                icon: null,
                onClick: () => setCommentSort("oldest"),
                isSelected: commentSort === "oldest",
              },
            ]}
          />
        </div>
        <ThreadsSidebar filter={commentFilter} sort={commentSort} />
      </div>
    </BlockNoteView>
  );
}
