import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useUIPluginState } from "../../hooks/useUIPluginState.js";
import { Thread } from "./Thread.js";
import { useThreads } from "./useThreads.js";
import { ThreadData } from "@blocknote/core/comments";
import { BlockNoteEditor } from "@blocknote/core";

function sortByPosition(
  editor: BlockNoteEditor<any, any, any>,
  threads: ThreadData[]
) {
  const sortedThreads: ThreadData[] = [];

  editor.prosemirrorState.doc.descendants((node) => {
    node.marks.forEach((mark) => {
      if (mark.type.name === "comment") {
        const threadIndex = threads.findIndex(
          (thread) => thread.id === mark.attrs.threadId
        );

        if (threadIndex !== -1) {
          sortedThreads.push(threads[threadIndex]);
        }
      }
    });
  });

  return sortedThreads;
}

function sortByNewest(threads: ThreadData[]) {
  return threads.sort((a, b) => {
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

function sortByReplies(threads: ThreadData[]) {
  return threads.sort((a, b) => {
    return b.comments.length - a.comments.length;
  });
}

/**
 * The ThreadsSidebar component can be used to display a list of comments in a sidebar.
 *
 * This component is similar to Google Docs "Show All Comments" sidebar (cmd+option+shift+A)
 */
export function ThreadsSidebar(props: {
  filter?: "open" | "resolved";
  // TODO: Should be implemented for both floating and sidebar views
  // maxCommentsPerThread?: number;
  sort?: "position" | "newest" | "replies";
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

  const filteredThreads = Array.from(threads.values()).filter((thread) =>
    props.filter === "resolved" ? thread.resolved : !thread.resolved
  );

  const sortedAndFilteredThreads =
    props.sort === "position"
      ? sortByPosition(editor, filteredThreads)
      : props.sort === "newest"
      ? sortByNewest(filteredThreads)
      : sortByReplies(filteredThreads);

  return (
    <div className={"bn-threads-sidebar"}>
      {sortedAndFilteredThreads.map((thread) => (
        <Thread
          key={thread.id}
          threadId={thread.id}
          showComposer={selectedThreadId === thread.id}
          onFocus={() => comments.selectThread(thread.id)}
          onBlur={() => comments.selectThread(undefined)}
          tabIndex={0}
        />
      ))}
    </div>
  );
}
