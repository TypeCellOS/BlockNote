import { BlockNoteEditor, UnreachableCaseError } from "@blocknote/core";
import { ThreadData } from "@blocknote/core/comments";
import { useMemo } from "react";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useUIPluginState } from "../../hooks/useUIPluginState.js";
import { Thread } from "./Thread.js";
import { useThreads } from "./useThreads.js";

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

  const state = useUIPluginState(
    editor.comments.onUpdate.bind(editor.comments)
  );
  const selectedThreadId = state?.selectedThreadId;

  const threads = useThreads(editor);

  // memo needed?
  const threadElements = useMemo(() => {
    const threadsArray = Array.from(threads.values());

    const sortedThreads = sortThreads(
      threadsArray,
      props.sort || "position",
      state?.threadPositions
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

    const threadDataToElement = (thread: ThreadData) => (
      <Thread
        key={thread.id}
        thread={thread}
        selected={thread.id === selectedThreadId}
        referenceText={getReferenceText(
          editor,
          state?.threadPositions.get(thread.id)
        )}
        maxCommentsBeforeCollapse={props.maxCommentsBeforeCollapse}
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
    props.maxCommentsBeforeCollapse,
    selectedThreadId,
    state?.threadPositions,
    threads,
  ]);

  return <div className={"bn-threads-sidebar"}>{threadElements}</div>;
}
