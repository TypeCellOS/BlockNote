"use client";

import { BlockNoteSchema } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import {
  useLiveblocksExtension,
  withLiveblocks,
} from "@liveblocks/react-blocknote";
import { Threads } from "./Threads";

export function Editor() {
  const liveblocks = useLiveblocksExtension();

  const schema = withLiveblocks(BlockNoteSchema.create());

  const editor = useCreateBlockNote({
    schema,
    _extensions: { liveblocksExtension: liveblocks },
    disableExtensions: ["history"],
  });

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
