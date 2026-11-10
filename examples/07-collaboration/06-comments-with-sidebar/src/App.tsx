"use client";

import { createUserStore } from "@blocknote/core";
import {
  DefaultThreadStoreAuth,
  CommentsExtension,
} from "@blocknote/core/comments";
import { withCollaboration, YjsThreadStore } from "@blocknote/core/yjs";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  FloatingComposerController,
  RenderInPortalElement,
  ThreadsSidebar,
  useCreateBlockNote,
} from "@blocknote/react";
import { useMemo, useState } from "react";
import YPartyKitProvider from "y-partykit/provider";
import * as Y from "yjs";

import { SettingsSelect } from "./SettingsSelect";
import { HARDCODED_USERS, MyUserType, getRandomColor } from "./userdata";

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

// A single user store, shared between the comments and collaboration extensions
// so they use one de-duped cache of resolved users.
const userStore = createUserStore(resolveUsers);

// Sets up Yjs document and PartyKit Yjs provider.
const doc = new Y.Doc();
const provider = new YPartyKitProvider(
  "blocknote-dev.yousefed.partykit.dev",
  // Use a unique name as a "room" for your application.
  "comments-with-sidebar",
  doc,
);

// This follows the Y-Sweet example to setup a collabotive editor
// (but of course, you also use other collaboration providers
// see the docs for more information)
export default function App() {
  const [activeUser, setActiveUser] = useState<MyUserType>(HARDCODED_USERS[0]);
  const [commentFilter, setCommentFilter] = useState<
    "open" | "resolved" | "all"
  >("open");
  const [commentSort, setCommentSort] = useState<
    "position" | "recent-activity" | "oldest"
  >("position");

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
      new DefaultThreadStoreAuth(activeUser.id, activeUser.role),
    );
  }, [activeUser]);

  // setup the editor with comments and collaboration
  const editor = useCreateBlockNote(
    withCollaboration({
      collaboration: {
        provider,
        fragment: doc.getXmlFragment("blocknote"),
        user: { color: getRandomColor(), name: activeUser.username },
        resolveUsers: userStore,
      },
      extensions: [CommentsExtension({ threadStore, resolveUsers: userStore })],
    }),
    [activeUser, threadStore],
  );

  // The element in your layout that the comments sidebar is rendered into.
  const [sidebarElement, setSidebarElement] = useState<HTMLDivElement | null>(
    null,
  );

  // The page layout is your application's own. BlockNote only renders the
  // editor (`BlockNoteView`) and, via `RenderInPortalElement`, the sidebar.
  return (
    <div className={"sidebar-comments-main-container"}>
      <div className={"editor-layout-wrapper"}>
        <section className={"editor-section"}>
          <h1>Editor</h1>
          <div className={"settings"}>
            <SettingsSelect
              label={"User"}
              value={activeUser.id}
              options={HARDCODED_USERS.map((user) => ({
                value: user.id,
                label: `${user.username} (${
                  user.role === "editor" ? "Editor" : "Commenter"
                })`,
              }))}
              onChange={(id) => {
                const user = HARDCODED_USERS.find((user) => user.id === id);
                if (user) {
                  setActiveUser(user);
                }
              }}
            />
          </div>
          <BlockNoteView
            editor={editor}
            editable={activeUser.role === "editor"}
            // Comments are shown in the sidebar instead of floating in the editor.
            comments={false}
          >
            {/* `comments={false}` also removes the floating composer, which
          creates new threads, so we add it back. */}
            <FloatingComposerController />
            {/* `ThreadsSidebar` needs the editor's context, so it's rendered
          inside `BlockNoteView`, but `RenderInPortalElement` places it in the
          sidebar element of the layout below. */}
            {sidebarElement && (
              <RenderInPortalElement target={sidebarElement}>
                <ThreadsSidebar filter={commentFilter} sort={commentSort} />
              </RenderInPortalElement>
            )}
          </BlockNoteView>
        </section>
      </div>
      <aside className={"threads-sidebar-section"}>
        <h1>Comments</h1>
        <div className={"settings"}>
          <SettingsSelect
            label={"Filter"}
            value={commentFilter}
            options={[
              { value: "all", label: "All" },
              { value: "open", label: "Open" },
              { value: "resolved", label: "Resolved" },
            ]}
            onChange={setCommentFilter}
          />
          <SettingsSelect
            label={"Sort"}
            value={commentSort}
            options={[
              { value: "position", label: "Position" },
              { value: "recent-activity", label: "Recent activity" },
              { value: "oldest", label: "Oldest" },
            ]}
            onChange={setCommentSort}
          />
        </div>
        <div className={"threads-sidebar-slot"} ref={setSidebarElement} />
      </aside>
    </div>
  );
}
