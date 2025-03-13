import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useUIPluginState } from "../../hooks/useUIPluginState.js";
import { Thread } from "./Thread.js";
import { useThreads } from "./useThreads.js";
import { ThreadData } from "@blocknote/core/comments";
import { useEffect, useMemo } from "react";
import { TextSelection } from "@tiptap/pm/state";

function sortThreads(
  threads: ThreadData[],
  threadPositions?: Map<string, { from: number; to: number }>,
  sort?: "position" | "newest" | "oldest"
) {
  if (sort === "position") {
    return threads.sort((a, b) => {
      const threadA = threadPositions?.get(a.id)?.from || Number.MAX_VALUE;
      const threadB = threadPositions?.get(b.id)?.from || Number.MAX_VALUE;

      return threadA - threadB;
    });
  }

  if (sort === "newest") {
    return threads.sort(
      (a, b) =>
        b.comments[b.comments.length - 1].createdAt.getTime() -
        a.comments[a.comments.length - 1].createdAt.getTime()
    );
  }

  if (sort === "oldest") {
    return threads.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
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

  useEffect(() => {
    if (!selectedThreadId) {
      return;
    }

    const selectedThreadPosition = state.threadPositions.get(selectedThreadId);
    if (!selectedThreadPosition) {
      return;
    }

    // When a new thread is selected, scrolls the page to its reference text in
    // the editor.
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

    // If the thread has been resolved, also select its reference text in the
    // editor.
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
      // If the thread was selected by focusing it in the sidebar (instead of
      // selecting its reference text in the editor), we also need to force the
      // editor selection to be visible as we want the thread in the sidebar to
      // remain focused.
      editor.setForceSelectionVisible(true);
    }
  }, [
    editor,
    editor.comments.plugin,
    editor.prosemirrorState,
    editor.prosemirrorState.doc,
    editor.prosemirrorView,
    selectedThreadId,
    state?.threadPositions,
    threads,
  ]);

  const threadElements = useMemo(() => {
    const threadsArray = Array.from(threads.values());

    const sortedThreads = sortThreads(
      threadsArray,
      state?.threadPositions,
      props.sort
    );

    const openThreads: ThreadData[] = [];
    const resolvedThreads: ThreadData[] = [];

    for (const thread of sortedThreads) {
      if (!thread.resolved) {
        openThreads.push(thread);
      } else {
        resolvedThreads.push(thread);
      }
    }

    const getReferenceText = (threadPosition?: {
      from: number;
      to: number;
    }) => {
      if (!threadPosition) {
        return "Original content deleted";
      }

      const referenceText = editor.prosemirrorState.doc.textBetween(
        threadPosition.from,
        threadPosition.to
      );

      if (referenceText.length > 100) {
        return `${referenceText.slice(0, 15)}...`;
      }

      return referenceText;
    };

    const threadDataToElement = (thread: ThreadData) => (
      <Thread
        key={thread.id}
        thread={thread}
        selected={thread.id === selectedThreadId}
        referenceText={getReferenceText(state?.threadPositions.get(thread.id))}
        onFocus={() => editor.comments?.selectThread(thread.id)}
        onBlur={(event) => {
          const targetElement =
            event.target instanceof Node ? event.target : null;
          const parentThreadElement =
            event.relatedTarget instanceof Node
              ? event.relatedTarget.closest(".bn-thread")
              : null;

          if (
            !targetElement ||
            !parentThreadElement ||
            !parentThreadElement.contains(targetElement)
          ) {
            editor.comments?.selectThread(undefined);
          }
        }}
        tabIndex={0}
      />
    );

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
    state?.threadPositions,
    threads,
  ]);

  return <div className={"bn-threads-sidebar"}>{threadElements}</div>;
}
