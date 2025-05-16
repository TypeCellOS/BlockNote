import { ThreadData } from "@blocknote/core/comments";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { Comment } from "./Comment.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useUsers } from "./useUsers.js";

export type CommentsProps = {
  thread: ThreadData;
  maxCommentsBeforeCollapse?: number;
};

export const Comments = ({
  thread,
  maxCommentsBeforeCollapse,
}: CommentsProps) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();
  const editor = useBlockNoteEditor();
  const users = useUsers(editor, thread.resolvedBy ? [thread.resolvedBy] : []);

  // Maps all comments to elements.
  const comments = thread.comments.map((comment, index) => (
    <Comment
      key={comment.id}
      thread={thread}
      comment={comment}
      showResolveButton={index === 0}
    />
  ));

  // Adds "resolved by" comment if needed.
  if (thread.resolved && thread.resolvedUpdatedAt && thread.resolvedBy) {
    const resolvedByUser = users.get(thread.resolvedBy);
    if (!resolvedByUser) {
      throw new Error(
        `User ${thread.resolvedBy} resolved thread ${thread.id}, but their data could not be found.`,
      );
    }

    const resolvedCommentIndex =
      thread.comments.findLastIndex(
        (comment) =>
          thread.resolvedUpdatedAt!.getTime() > comment.createdAt.getTime(),
      ) + 1;

    comments.splice(
      resolvedCommentIndex,
      0,
      <Components.Comments.Comment
        key={"resolved-comment"}
        className={"bn-thread-comment"}
        authorInfo={
          (thread.resolvedBy && users.get(thread.resolvedBy)) || "loading"
        }
        timeString={thread.resolvedUpdatedAt.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })}
        edited={false}
        showActions={false}
      >
        <div className={"bn-resolved-text"}>
          {dict.comments.sidebar.marked_as_resolved}
        </div>
      </Components.Comments.Comment>,
    );
  }

  // Collapses replies if needed.
  if (
    maxCommentsBeforeCollapse &&
    comments.length > maxCommentsBeforeCollapse
  ) {
    comments.splice(
      1,
      comments.length - 2,
      <Components.Comments.ExpandSectionsPrompt
        key={"expand-prompt"}
        className={"bn-thread-expand-prompt"}
      >
        {dict.comments.sidebar.more_replies(thread.comments.length - 2)}
      </Components.Comments.ExpandSectionsPrompt>,
    );
  }

  return comments;
};
