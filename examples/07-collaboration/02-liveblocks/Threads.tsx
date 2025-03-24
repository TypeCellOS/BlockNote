import { BlockNoteEditor } from "@blocknote/core";
import { useThreads } from "@liveblocks/react/suspense";
import {
  AnchoredThreads,
  FloatingComposer,
  FloatingThreads,
} from "@liveblocks/react-blocknote";

export function Threads({ editor }: { editor: BlockNoteEditor | null }) {
  const { threads } = useThreads({ query: { resolved: false } });

  if (!editor) {
    return null;
  }

  return (
    <>
      <div className="anchored-threads">
        <AnchoredThreads editor={editor} threads={threads} />
      </div>
      <FloatingThreads
        editor={editor}
        threads={threads}
        className="floating-threads"
      />
      <FloatingComposer editor={editor} className="floating-composer" />
    </>
  );
}
