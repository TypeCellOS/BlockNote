"use client";

import {
  DefaultThreadStoreAuth,
  YjsThreadStore,
} from "@blocknote/core/comments";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { YDocProvider, useYDoc, useYjsProvider } from "@y-sweet/react";
import { useMemo, useState } from "react";

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

// This follows the Y-Sweet example to setup a collabotive editor
// (but of course, you also use other collaboration providers
// see the docs for more information)
export default function App() {
  const docId = "my-blocknote-document-with-comments-1";

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
      className={"comments-main-container"}
      editor={editor}
      editable={activeUser.role === "editor"}>
      {/* We place user settings select within `BlockNoteView` as it uses
      BlockNote UI components and needs the context for them. */}
      <div className={"settings"}>
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
      </div>
    </BlockNoteView>
  );
}
