"use client";

import { DefaultThreadStoreAuth, User, YjsThreadStore } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { Select } from "@mantine/core";
import { useYDoc, useYjsProvider, YDocProvider } from "@y-sweet/react";
import { useMemo, useState } from "react";

const colors = [
  "#958DF1",
  "#F98181",
  "#FBBC88",
  "#FAF594",
  "#70CFF8",
  "#94FADB",
  "#B9F18D",
];

const getRandomElement = (list: any[]) =>
  list[Math.floor(Math.random() * list.length)];

const getRandomColor = () => getRandomElement(colors);

type MyUserType = User & {
  role: "editor" | "comment";
};

const HARDCODED_USERS: MyUserType[] = [
  {
    id: "1",
    username: "John Doe",
    avatarUrl: "https://placehold.co/100x100?text=John",
    role: "editor",
  },
  {
    id: "2",
    username: "Jane Doe",
    avatarUrl: "https://placehold.co/100x100?text=Jane",
    role: "editor",
  },
  {
    id: "3",
    username: "Bob Smith",
    avatarUrl: "https://placehold.co/100x100?text=Bob",
    role: "comment",
  },
  {
    id: "4",
    username: "Betty Smith",
    avatarUrl: "https://placehold.co/100x100?text=Betty",
    role: "comment",
  },
];

// The resolveUsers function fetches information about your users
// (e.g. their name, avatar, etc.). Usually, you'd fetch this from your
// own database or user management system.
// Here, we just return the hardcoded users.
async function resolveUsers(userIds: string[]) {
  // fake a (slow) network request
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return HARDCODED_USERS.filter((user) => userIds.includes(user.id));
}

// This follows the Y-Sweet demo to setup a collabotive editor
// (but of course, you also use other collaboration providers)
export default function App() {
  const docId = "my-blocknote-document-with-comments";

  return (
    <YDocProvider
      docId={docId}
      authEndpoint="https://demos.y-sweet.dev/api/auth">
      <Document />
    </YDocProvider>
  );
}

function Document() {
  const [user, setUser] = useState<MyUserType>(HARDCODED_USERS[0]);
  const provider = useYjsProvider();

  // take the Y.Doc collaborative document from Y-Sweet
  const doc = useYDoc();

  // setup the thread store which stores / and syncs thread / comment data
  const threadStore = useMemo(() => {
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

  // TODO: make sure comment button / formatting toolbar appears for comment-only users
  return (
    <div>
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
      <BlockNoteView editor={editor} editable={user.role === "editor"} />
    </div>
  );
}
