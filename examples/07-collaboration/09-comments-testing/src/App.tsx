"use client";

import {
  CommentsExtension,
  DefaultThreadStoreAuth,
  YjsThreadStore,
} from "@blocknote/core/comments";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useMemo } from "react";
import * as Y from "yjs";

const USER = {
  id: "1",
  username: "John Doe",
  avatarUrl: "https://placehold.co/100x100?text=John",
  role: "editor" as const,
};

async function resolveUsers(userIds: string[]) {
  return [USER].filter((user) => userIds.includes(user.id));
}

export default function App() {
  const doc = useMemo(() => new Y.Doc(), []);

  const threadStore = useMemo(() => {
    return new YjsThreadStore(
      USER.id,
      doc.getMap("threads"),
      new DefaultThreadStoreAuth(USER.id, USER.role),
    );
  }, [doc]);

  const editor = useCreateBlockNote(
    {
      extensions: [CommentsExtension({ threadStore, resolveUsers })],
    },
    [threadStore],
  );

  return <BlockNoteView editor={editor} />;
}
