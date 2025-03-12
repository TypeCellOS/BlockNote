import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useUIPluginState } from "../../hooks/useUIPluginState.js";
import { Thread } from "./Thread.js";
import { useThreads } from "./useThreads.js";
import { ThreadData } from "@blocknote/core/comments";
import { BlockNoteEditor } from "@blocknote/core";
import { useEffect, useMemo } from "react";
import { TextSelection } from "@tiptap/pm/state";

function sortThreads(
  editor: BlockNoteEditor<any, any, any>,
  threads: ThreadData[],
  sort?: "position" | "newest" | "oldest"
) {
  if (sort === "position") {
    return threads.sort((a, b) => {
      const threadA =
        editor.comments?.plugin
          .getState(editor.prosemirrorState)
          .threadPositions.get(a.id)?.from || Number.MAX_VALUE;
      const threadB =
        editor.comments?.plugin
          .getState(editor.prosemirrorState)
          .threadPositions.get(b.id)?.from || Number.MAX_VALUE;

      return threadA - threadB;
    });
  }

  if (sort === "newest") {
    return threads.sort((a, b) => {
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  if (sort === "oldest") {
    return threads.sort((a, b) => {
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  return threads;
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

  const threadPositions = useMemo<
    | Map<
        string,
        {
          from: number;
          to: number;
        }
      >
    | undefined
  >(
    () =>
      editor.comments?.plugin.getState(editor.prosemirrorState)
        ?.threadPositions,
    [editor.comments?.plugin, editor.prosemirrorState]
  );

  useEffect(() => {
    if (!selectedThreadId) {
      return;
    }

    const selectedThreadPosition = threadPositions?.get(selectedThreadId);
    if (!selectedThreadPosition) {
      return;
    }

    (
      editor.prosemirrorView?.domAtPos(selectedThreadPosition.from).node as
        | Element
        | undefined
    )?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    const selectedThread = threads.get(selectedThreadId);
    if (!selectedThread) {
      return;
    }

    if (selectedThread.resolved) {
      editor.prosemirrorView?.dispatch(
        editor.prosemirrorState.tr.setSelection(
          TextSelection.create(
            editor.prosemirrorState.doc,
            selectedThreadPosition.from,
            selectedThreadPosition.to
          )
        )
      );
      editor.setForceSelectionVisible(true);
    }
  }, [
    editor.comments.plugin,
    editor.prosemirrorState,
    editor.prosemirrorState.doc,
    editor.prosemirrorView,
    selectedThreadId,
    threadPositions,
  ]);

  const threadElements = useMemo(() => {
    const threadsArray = Array.from(threads.values());

    const sortedThreads = sortThreads(editor, threadsArray, props.sort);

    const openThreads: ThreadData[] = [];
    const resolvedThreads: ThreadData[] = [];

    for (const thread of sortedThreads) {
      if (!thread.resolved) {
        openThreads.push(thread);
      } else {
        resolvedThreads.push(thread);
      }
    }

    const threadDataToElement = (thread: ThreadData) => {
      const threadPosition = threadPositions?.get(thread.id);

      return (
        <Thread
          key={thread.id}
          thread={thread}
          view={"sidebar"}
          selected={thread.id === selectedThreadId}
          highlightedText={
            threadPosition
              ? `"${editor.prosemirrorState.doc.textBetween(
                  threadPosition.from,
                  threadPosition.to
                )}"`
              : "Original content deleted"
          }
        />
      );
    };

    if (props.filter === "open") {
      return openThreads.map(threadDataToElement);
    }

    if (props.filter === "resolved") {
      return resolvedThreads.map(threadDataToElement);
    }

    return [...openThreads, ...resolvedThreads].map(threadDataToElement);
  }, [
    editor,
    props.filter,
    props.sort,
    selectedThreadId,
    threadPositions,
    threads,
  ]);

  return <div className={"bn-threads-sidebar"}>{threadElements}</div>;
}
