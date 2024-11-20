"use client";

import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNoteWithLiveblocks } from "@liveblocks/react-blocknote";
import { Threads } from "./Threads";
export function Editor() {
  const editor = useCreateBlockNoteWithLiveblocks({});

  return (
    <BlockNoteView
      onChange={() => {
        console.log(editor.document);
      }}
      editor={editor}>
      <Threads editor={editor} />
    </BlockNoteView>
  );
}
