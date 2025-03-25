import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNoteWithLiveblocks } from "@liveblocks/react-blocknote";

import { Threads } from "./Threads.js";

export function Editor() {
  const editor = useCreateBlockNoteWithLiveblocks({}, { mentions: true });

  return (
    <div>
      <BlockNoteView editor={editor} className="editor" />
      <Threads editor={editor} />
    </div>
  );
}
