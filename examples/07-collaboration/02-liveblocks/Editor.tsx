"use client";

import { DefaultThreadStoreAuth, LiveBlocksThreadStore } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import {
  useClient,
  useCreateThread,
  useRoom,
  useSelf,
  useThreads,
} from "@liveblocks/react";
import { useMemo } from "react";
// import { useCreateBlockNoteWithLiveblocks } from "@liveblocks/react-blocknote";
// import { Threads } from "./Threads";
export function Editor() {
  const createThread = useCreateThread();
  const threads = useThreads();

  const user = useSelf();
  const room = useRoom();
  const client = useClient();

  // const x = useUser()
  const threadStore = useMemo(() => {
    if (!user) {
      return undefined;
    }

    return new LiveBlocksThreadStore(
      { createThread, threads },
      // todo: cancomment
      new DefaultThreadStoreAuth(
        user!.id!,
        user?.canWrite ? "editor" : "comment"
      )
    );
  }, [createThread, user, threads]);

  const editor = useCreateBlockNote(
    {
      comments: threadStore
        ? {
            threadStore,
          }
        : undefined,
      resolveUsers: async (id) => {
        return {} as any;
      },
    },
    [threadStore]
  );

  return (
    <BlockNoteView editor={editor}>
      {/* <Threads editor={editor} /> */}
    </BlockNoteView>
  );
}
