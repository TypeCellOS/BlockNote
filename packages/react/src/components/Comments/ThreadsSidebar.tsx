import { BlockNoteEditor, UnreachableCaseError } from "@blocknote/core";
import { ThreadData } from "@blocknote/core/comments";
import React, { FocusEvent, useCallback, useMemo } from "react";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useUIPluginState } from "../../hooks/useUIPluginState.js";
import { Thread } from "./Thread.js";
import { useThreads } from "./useThreads.js";

type ThreadItemProps = {
  thread: ThreadData;
  selectedThreadId?: string;
  editor: BlockNoteEditor<any, any, any>;
  maxCommentsBeforeCollapse?: number;
  referenceText: string;
};

/**
 * This component is memoized because it's a child of the ThreadsSidebar component,
 * which rerenders on every document update.
 */
const ThreadItem = React.memo(
  ({
    thread,
    selectedThreadId,
    editor,
    maxCommentsBeforeCollapse,
    referenceText,
  }: ThreadItemProps) => {
    const onFocus = useCallback(
      (event: FocusEvent) => {
        // If the focused element is within the action toolbar, we don't want to
        // focus the thread for UX reasons.
        if ((event.target as HTMLElement).closest(".bn-action-toolbar")) {
          return;
        }

        editor.comments?.selectThread(thread.id);
      },
      [editor.comments, thread.id],
    );

    const onBlur = useCallback(
      (event: React.FocusEvent) => {
        // If the focused element is within the action toolbar, we don't want to
        // blur the thread for UX reasons.
        if (
          !event.relatedTarget ||
          event.relatedTarget.closest(".bn-action-toolbar")
        ) {
          return;
        }

        const targetElement =
          event.target instanceof Node ? event.target : null;
        const parentThreadElement =
          event.relatedTarget instanceof Node
            ? event.relatedTarget.closest(".bn-thread")
            : null;

        // When you focus the editor (reply composer), we don't want to unselect the thread
        // This check prevents that. But we still want to unselect the thread when it gets blurred in all other cases
        if (
          !targetElement ||
          !parentThreadElement ||
          !parentThreadElement.contains(targetElement)
        ) {
          editor.comments?.selectThread(undefined);
        }
      },
      [editor.comments],
    );

    return (
      <Thread
        thread={thread}
        selected={thread.id === selectedThreadId}
        referenceText={referenceText}
        maxCommentsBeforeCollapse={maxCommentsBeforeCollapse}
        onFocus={onFocus}
        onBlur={onBlur}
        tabIndex={0}
      />
    );
  },
);

function sortThreads(
  threads: ThreadData[],
  sort: "position" | "recent-activity" | "oldest",
  threadPositions?: Map<string, { from: number; to: number }>,
) {
  if (sort === "recent-activity") {
    // sort by latest comment in thread first
    return threads.sort(
      (a, b) =>
        b.comments[b.comments.length - 1].createdAt.getTime() -
        a.comments[a.comments.length - 1].createdAt.getTime(),
    );
  }

  if (sort === "oldest") {
    // sort by oldest thread first
    return threads.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }

  if (sort === "position") {
    // sort by position in document (when the comment mark is deleted, use Number.MAX_VALUE)
    return threads.sort((a, b) => {
      const threadA = threadPositions?.get(a.id)?.from || Number.MAX_VALUE;
      const threadB = threadPositions?.get(b.id)?.from || Number.MAX_VALUE;

      return threadA - threadB;
    });
  }

  throw new UnreachableCaseError(sort);
}

/**
 * Returns the text for a thread (basically, the text where the mark is).
 *
 * Note / TODO: it might be nicer to store and use the original content
 * when the thread was created, instead of taking the actual content from the editor
 */
export function getReferenceText(
  editor: BlockNoteEditor<any, any, any>,
  threadPosition?: {
    from: number;
    to: number;
  },
) {
  return editor.transact((tr) => {
    if (!threadPosition) {
      return "Original content deleted";
    }

    // TODO: Handles an edge case where the editor is re-rendered and the document
    //  is not yet fetched (causing it to be empty). We should store the original
    //  reference text in the data model, as not only is it a general improvement,
    //  but it also means we won't have to handle this edge case.
    if (tr.doc.nodeSize < threadPosition.to) {
      return "";
    }

    const referenceText = tr.doc.textBetween(
      threadPosition.from,
      threadPosition.to,
    );

    if (referenceText.length > 15) {
      return `${referenceText.slice(0, 15)}…`;
    }

    return referenceText;
  });
}

/**
 * The ThreadsSidebar component can be used to display a list of comments in a sidebar.
 *
 * This component is similar to Google Docs "Show All Comments" sidebar (cmd+option+shift+A)
 */
export function ThreadsSidebar(props: {
  /**
   * Filter the comments in the sidebar. Can pass `"open"`, `"resolved"`, or
   * `"all"`, to only show open, resolved, or all comments.
   *
   * @default "all"
   */
  filter?: "open" | "resolved" | "all";
  /**
   * The maximum number of comments that can be in a thread before the replies
   * get collapsed.
   *
   * @default 5
   */
  maxCommentsBeforeCollapse?: number;
  /**
   * Sort the comments in the sidebar. Can pass `"position"`,
   * `"recent-activity"`, or `"oldest"`. Sorting by `"recent-activity"` uses the
   * most recently added comment to sort threads, while `"oldest"` uses the
   * thread creation date. Sorting by `"position"` puts comments in the same
   * order as their reference text in the editor.
   *
   * @default "position"
   */
  sort?: "position" | "recent-activity" | "oldest";
}) {
  const editor = useBlockNoteEditor();

  if (!editor.comments) {
    throw new Error("Comments plugin not found");
  }

  // Note: because "threadPositions" is part of the state,
  // this will potentially trigger a re-render on every document update
  // this means we need to be mindful of children memoization
  const state = useUIPluginState(
    editor.comments.onUpdate.bind(editor.comments),
  );

  const selectedThreadId = state?.selectedThreadId;

  const threads = useThreads(editor);

  const filteredAndSortedThreads = useMemo(() => {
    const threadsArray = Array.from(threads.values());

    const sortedThreads = sortThreads(
      threadsArray,
      props.sort || "position",
      state?.threadPositions,
    );

    const ret: Array<{ thread: ThreadData; referenceText: string }> = [];

    for (const thread of sortedThreads) {
      if (!thread.resolved) {
        if (props.filter === "open" || props.filter === "all") {
          ret.push({
            thread,
            referenceText: getReferenceText(
              editor,
              state?.threadPositions.get(thread.id),
            ),
          });
        }
      } else {
        if (props.filter === "resolved" || props.filter === "all") {
          ret.push({
            thread,
            referenceText: getReferenceText(
              editor,
              state?.threadPositions.get(thread.id),
            ),
          });
        }
      }
    }

    return ret;
  }, [threads, state?.threadPositions, props.filter, props.sort, editor]);

  return (
    <div className={"bn-threads-sidebar"}>
      {filteredAndSortedThreads.map((thread) => (
        <ThreadItem
          key={thread.thread.id}
          thread={thread.thread}
          selectedThreadId={selectedThreadId}
          editor={editor}
          referenceText={thread.referenceText}
          maxCommentsBeforeCollapse={props.maxCommentsBeforeCollapse}
        />
      ))}
    </div>
  );
}
