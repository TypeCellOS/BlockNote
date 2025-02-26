"use client";

import {
  DefaultThreadStoreAuth,
  YjsThreadStore,
} from "@blocknote/core/comments";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { MantineProvider, Select } from "@mantine/core";
import { YDocProvider, useYDoc, useYjsProvider } from "@y-sweet/react";
import { useMemo, useState } from "react";
import { HARDCODED_USERS, MyUserType, getRandomColor } from "./userdata.js";

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
  const docId = "my-blocknote-document-with-comments";

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

function Document() {
  const [user, setUser] = useState<MyUserType>(HARDCODED_USERS[0]);
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
      user.id,
      doc.getMap("threads"),
      new DefaultThreadStoreAuth(user.id, user.role)
    );
  }, [doc, user]);

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
        user: { color: getRandomColor(), name: user.username },
      },
    },
    [user, threadStore]
  );

  return (
    <div>
      {/* This is a simple user selector to switch between users, for demo purposes */}
      <Select
        style={{ maxWidth: "300px" }}
        required
        label="Active user:"
        placeholder="Pick value"
        data={HARDCODED_USERS.map((user) => ({
          value: user.id,
          label: user.username + " (" + user.role + ")",
        }))}
        onChange={(value) => {
          if (!value) {
            return;
          }
          setUser(HARDCODED_USERS.find((user) => user.id === value)!);
        }}
        value={user.id}
      />
      {/* render the actual editor */}
      <BlockNoteView editor={editor} editable={user.role === "editor"} />
    </div>
  );
}
