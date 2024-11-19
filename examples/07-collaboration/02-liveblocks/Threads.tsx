import { BlockNoteEditor } from "@blocknote/core";
import {
  AnchoredThreads,
  FloatingComposer,
  FloatingThreads,
} from "@liveblocks/react-blocknote";
import { useThreads } from "@liveblocks/react/suspense";

export function Threads({
  editor,
}: {
  editor: BlockNoteEditor<any, any, any>;
}) {
  const { threads } = useThreads({ query: { resolved: false } });

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
