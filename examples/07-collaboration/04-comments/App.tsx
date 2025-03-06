"use client";

import {
  DefaultThreadStoreAuth,
  YjsThreadStore,
} from "@blocknote/core/comments";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  BlockNoteViewEditor,
  ComponentProps,
  ThreadsSidebar,
  useComponentsContext,
  useCreateBlockNote,
} from "@blocknote/react";
import { MantineProvider } from "@mantine/core";
import { YDocProvider, useYDoc, useYjsProvider } from "@y-sweet/react";
import { useMemo, useState } from "react";
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
  const docId = "my-blocknote-document-with-comments-1";

  return (
    <MantineProvider>
      <YDocProvider
        docId={docId}
        authEndpoint="https://demos.y-sweet.dev/api/auth">
        <Document />
      </YDocProvider>
    </MantineProvider>
  );
}

const SettingsSelect = (props: {
  label: string;
  items: ComponentProps["FormattingToolbar"]["Select"]["items"];
}) => {
  const Components = useComponentsContext()!;

  return (
    <div className={"bn-settings-select"}>
      <Components.FormattingToolbar.Root className={"bn-toolbar"}>
        <h2>{props.label + ":"}</h2>
        <Components.FormattingToolbar.Select
          className={"bn-select"}
          items={props.items}
        />
      </Components.FormattingToolbar.Root>
    </div>
  );
};

function Document() {
  const [activeUser, setActiveUser] = useState<MyUserType>(HARDCODED_USERS[0]);
  const [commentView, setCommentView] = useState<"floating" | "sidebar">(
    "sidebar"
  );
  const [commentFilter, setCommentFilter] = useState<"open" | "resolved">(
    "open"
  );
  const [commentSort, setCommentSort] = useState<
    "position" | "newest" | "replies"
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
    //   user.id,
    //   provider,
    //   new DefaultThreadStoreAuth(user.id, user.role)
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
      className={"bn-main-container"}
      editor={editor}
      editable={activeUser.role === "editor"}
      renderEditor={false}
      comments={commentView === "floating"}>
        <div className={"bn-editor-layout-wrapper"}>
          <div className={"bn-editor-section"}>
            <h1>Editor</h1>
            <div className={"bn-settings"}>
              <SettingsSelect
                label={"User"}
                items={HARDCODED_USERS.map((user) => ({
                  text: `${user.username} (${
                    user.role === "editor" ? "Editor" : "Commenter"
                  })`,
                  icon: null,
                  onClick: () => setActiveUser(user),
                  isSelected: user.id === activeUser.id,
                }))}
              />
              <SettingsSelect
                label={"Comments"}
                items={[
                  {
                    text: "Floating",
                    icon: null,
                    onClick: () => setCommentView("floating"),
                    isSelected: commentView === "floating",
                  },
                  {
                    text: "Sidebar",
                    icon: null,
                    onClick: () => setCommentView("sidebar"),
                    isSelected: commentView === "sidebar",
                  },
                ]}
              />
            </div>
            <BlockNoteViewEditor />
          </div>
        </div>
        {commentView === "sidebar" && (
          <div className={"bn-threads-sidebar-section"}>
            <h1>Comments</h1>
            <div className={"bn-settings"}>
              <SettingsSelect
                label={"Filter"}
                items={[
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
                    text: "Newest",
                    icon: null,
                    onClick: () => setCommentSort("newest"),
                    isSelected: commentSort === "newest",
                  },
                  {
                    text: "Replies",
                    icon: null,
                    onClick: () => setCommentSort("replies"),
                    isSelected: commentSort === "replies",
                  },
                ]}
              />
            </div>
            <ThreadsSidebar filter={commentFilter} sort={commentSort} />
          </div>
        )}
    </BlockNoteView>
  );
}
