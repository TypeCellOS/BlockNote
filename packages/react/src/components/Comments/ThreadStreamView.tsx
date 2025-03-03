import { useMemo } from "react";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useUIPluginState } from "../../hooks/useUIPluginState.js";
import { Thread } from "./Thread.js";
import { useThreads } from "./useThreads.js";

/**
 * The ThreadStreamView component can be used to display a list of comments in a sidebar.
 *
 * This component is similar to Google Docs "Show All Comments" sidebar (cmd+option+shift+A)
 */
export function ThreadStreamView(_props: {
  maxCommentsPerThread?: number;
  sort?: "document-order" | "newest-first" | "oldest-first";
}) {
  const editor = useBlockNoteEditor();

  if (!editor.comments) {
    throw new Error("Comments plugin not found");
  }

  const comments = editor.comments;

  const state = useUIPluginState(
    editor.comments.onUpdate.bind(editor.comments)
  );

  const selectedThreadId = state?.selectedThreadId;

  const threads = useThreads(editor);

  const { open, resolved } = useMemo(() => {
    const allThreads = Array.from(threads.values());

    const open = [];
    const resolved = [];

    for (const thread of allThreads) {
      if (!thread.resolved) {
        open.push(thread);
      } else {
        resolved.push(thread);
      }
    }

    return { open, resolved };
  }, [threads]);

  return (
    <div className={"bn-thread-stream"}>
      <h2>Open</h2>
      {open.map((thread) => (
        <Thread
          key={thread.id}
          threadId={thread.id}
          showComposer={selectedThreadId === thread.id}
          onFocus={() => {
            comments.selectThread(thread.id);
          }}
          onBlur={() => {
            comments.selectThread(undefined);
          }}
          tabIndex={0}
        />
      ))}
      <h2>Resolved</h2>
      {resolved.map((thread) => (
        <Thread
          key={thread.id}
          threadId={thread.id}
          showComposer={selectedThreadId === thread.id}
          onFocus={() => {
            console.log("focus");
            comments.selectThread(thread.id);
          }}
          onBlur={() => {
            console.log("blur");
            comments.selectThread(undefined);
          }}
          tabIndex={0}
        />
      ))}
      {/*<Thread*/}
      {/*  key={threads[0].id}*/}
      {/*  threadId={threads[0].id}*/}
      {/*  showComposer={selectedThreadId === threads[0].id}*/}
      {/*  onFocus={() => {*/}
      {/*    comments.selectThread(threads[0].id);*/}
      {/*  }}*/}
      {/*  onBlur={() => {*/}
      {/*    comments.selectThread(undefined);*/}
      {/*  }}*/}
      {/*  tabIndex={0}*/}
      {/*/>*/}
    </div>
  );
}
