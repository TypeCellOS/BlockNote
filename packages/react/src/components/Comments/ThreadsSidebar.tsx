import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useUIPluginState } from "../../hooks/useUIPluginState.js";
import { Thread } from "./Thread.js";
import { useThreads } from "./useThreads.js";
import { ThreadData } from "@blocknote/core/comments";
import { BlockNoteEditor } from "@blocknote/core";
import { useEffect, useMemo } from "react";

function sortByPosition(
  editor: BlockNoteEditor<any, any, any>,
  threads: ThreadData[]
) {
  const sortedThreads: ThreadData[] = [];

  editor.prosemirrorState.doc.descendants((node) => {
    node.marks.forEach((mark) => {
      if (mark.type.name === "comment") {
        const thread = threads.find(
          (thread) => thread.id === mark.attrs.threadId
        );

        if (thread) {
          sortedThreads.push(thread);
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

function sortByOldest(threads: ThreadData[]) {
  return threads.sort((a, b) => {
    return a.createdAt.getTime() - b.createdAt.getTime();
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
  sort?: "position" | "newest" | "oldest";
}) {
  const editor = useBlockNoteEditor();

  if (!editor.comments) {
    throw new Error("Comments plugin not found");
  }

  const state = useUIPluginState(
    editor.comments.onUpdate.bind(editor.comments)
  );
  const selectedThreadId = state?.selectedThreadId;

  const threads = useThreads(editor);

  useEffect(() => {
    editor.prosemirrorState.doc.descendants((node, pos) => {
      node.marks.forEach((mark) => {
        if (
          mark.type.name === "comment" &&
          mark.attrs.threadId === selectedThreadId
        ) {
          (
            editor.prosemirrorView?.domAtPos(pos).node as Element | undefined
          )?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      });
    });
  }, [editor.prosemirrorState.doc, editor.prosemirrorView, selectedThreadId]);

  const threadElements = useMemo(() => {
    const threadsArray = Array.from(threads.values());

    const sortedThreads =
      props.sort === "position"
        ? sortByPosition(editor, threadsArray)
        : props.sort === "newest"
        ? sortByNewest(threadsArray)
        : sortByOldest(threadsArray);

    const openThreads: ThreadData[] = [];
    const resolvedThreads: ThreadData[] = [];

    for (const thread of sortedThreads) {
      if (!thread.resolved) {
        openThreads.push(thread);
      } else {
        resolvedThreads.push(thread);
      }
    }

    const threadDataToElement = (thread: ThreadData) => (
      <Thread
        key={thread.id}
        thread={thread}
        view={"sidebar"}
        selected={thread.id === selectedThreadId}
      />
    );

    if (props.filter === "open") {
      return openThreads.map(threadDataToElement);
    }

    if (props.filter === "resolved") {
      return resolvedThreads.map(threadDataToElement);
    }

    return [...openThreads, ...resolvedThreads].map(threadDataToElement);
  }, [editor, props.filter, props.sort, selectedThreadId, threads]);

  return <div className={"bn-threads-sidebar"}>{threadElements}</div>;
}
