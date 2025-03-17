import { BlockNoteEditor, UnreachableCaseError } from "@blocknote/core";
import { ThreadData } from "@blocknote/core/comments";
import React, { useCallback, useMemo } from "react";
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
    const onFocus = useCallback(() => {
      editor.comments?.selectThread(thread.id);
    }, [editor.comments, thread.id]);

    const onBlur = useCallback(
      (event: React.FocusEvent) => {
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
      [editor.comments]
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
  }
);

function sortThreads(
  threads: ThreadData[],
  sort: "position" | "recent-activity" | "oldest",
  threadPositions?: Map<string, { from: number; to: number }>
) {
  if (sort === "recent-activity") {
    // sort by latest comment in thread first
    return threads.sort(
      (a, b) =>
        b.comments[b.comments.length - 1].createdAt.getTime() -
        a.comments[a.comments.length - 1].createdAt.getTime()
    );
  }

  if (sort === "oldest") {
    // sort by oldest thread first
    return threads.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
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
function getReferenceText(
  editor: BlockNoteEditor<any, any, any>,
  threadPosition?: {
    from: number;
    to: number;
  }
) {
  if (!threadPosition) {
    return "Original content deleted";
  }

  const referenceText = editor.prosemirrorState.doc.textBetween(
    threadPosition.from,
    threadPosition.to
  );

  if (referenceText.length > 15) {
    return `${referenceText.slice(0, 15)}…`;
  }

  return referenceText;
}

/**
 * The ThreadsSidebar component can be used to display a list of comments in a sidebar.
 *
 * This component is similar to Google Docs "Show All Comments" sidebar (cmd+option+shift+A)
 */
export function ThreadsSidebar(props: {
  /**
   * TODO: docs
   *
   * @default "all"
   */
  filter?: "open" | "resolved" | "all";
  /**
   * TODO: docs
   *
   * @default 5
   */
  maxCommentsBeforeCollapse?: number;
  /**
   * TODO: docs
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
    editor.comments.onUpdate.bind(editor.comments)
  );

  const selectedThreadId = state?.selectedThreadId;

  const threads = useThreads(editor);

  const filteredAndSortedThreads = useMemo(() => {
    const threadsArray = Array.from(threads.values());

    const sortedThreads = sortThreads(
      threadsArray,
      props.sort || "position",
      state?.threadPositions
    );

    const ret: Array<{ thread: ThreadData; referenceText: string }> = [];

    for (const thread of sortedThreads) {
      if (!thread.resolved) {
        if (props.filter === "open" || props.filter === "all") {
          ret.push({
            thread,
            referenceText: getReferenceText(
              editor,
              state?.threadPositions.get(thread.id)
            ),
          });
        }
      } else {
        if (props.filter === "resolved" || props.filter === "all") {
          ret.push({
            thread,
            referenceText: getReferenceText(
              editor,
              state?.threadPositions.get(thread.id)
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
