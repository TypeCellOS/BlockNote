import { mergeCSSClasses } from "@blocknote/core";
import { useCallback, useMemo, useState } from "react";
import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useCreateBlockNote } from "../../hooks/useCreateBlockNote.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { Comment } from "./Comment.js";
import { CommentEditor } from "./CommentEditor.js";
import { schema } from "./schema.js";
import { useUsers } from "./useUsers.js";
import { ThreadData } from "@blocknote/core/comments";

export type ThreadProps = {
  thread: ThreadData;
  view: "floating" | "sidebar";
  selected: boolean;
  maxCommentsBeforeCollapse?: number;
};

/**
 * The Thread component displays a (main) comment with a list of replies (other comments).
 *
 * It also includes a composer to reply to the thread.
 */
export const Thread = ({
  thread,
  view,
  selected,
  maxCommentsBeforeCollapse,
}: ThreadProps) => {
  // TODO: if REST API becomes popular, all interactions (click handlers) should implement a loading state and error state
  // (or optimistic local updates)

  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const editor = useBlockNoteEditor();

  const comments = editor.comments;
  if (!comments) {
    throw new Error("Comments plugin not found");
  }

  const userIds = useMemo(() => {
    return thread.comments.flatMap((c) => [
      c.userId,
      ...c.reactions.flatMap((r) => r.userIds),
    ]);
  }, [thread.comments]);

  // load all user data
  const users = useUsers(editor, userIds);

  const newCommentEditor = useCreateBlockNote({
    trailingBlock: false,
    dictionary: {
      ...dict,
      placeholders: {
        emptyDocument: dict.placeholders.comment_reply,
      },
    },
    schema,
  });

  const onNewCommentSave = useCallback(async () => {
    await comments.threadStore.addComment({
      comment: {
        body: newCommentEditor.document,
      },
      threadId: thread.id,
    });

    // reset editor
    newCommentEditor.removeBlocks(newCommentEditor.document);
  }, [comments, newCommentEditor, thread.id]);

  const [showAllComments, setShowAllComments] = useState(
    view === "floating" ||
      thread.comments.length <= (maxCommentsBeforeCollapse || 5)
  );

  const commentElements = useMemo(() => {
    if (!showAllComments) {
      return [
        <Comment
          key={thread.comments[0].id}
          thread={thread}
          comment={thread.comments[0]}
          index={0}
        />,
        <Components.Comments.ExpandSectionsPrompt
          className={"bn-thread-expand-prompt"}
          onClick={(event) => {
            setShowAllComments(true);
            editor.comments?.selectThread(thread.id);
            (
              (event.target as Element).closest(
                ".bn-thread"
              ) as HTMLElement | null
            )?.focus();
          }}>
          {`${thread.comments.length - 2} more replies`}
        </Components.Comments.ExpandSectionsPrompt>,
        <Comment
          key={thread.comments[thread.comments.length - 1].id}
          thread={thread}
          comment={thread.comments[thread.comments.length - 1]}
          index={thread.comments.length - 1}
        />,
      ];
    }

    return thread.comments.map((comment, index) => {
      return (
        <Comment
          key={comment.id}
          thread={thread}
          comment={comment}
          index={index}
        />
      );
    });
  }, [Components, editor.comments, showAllComments, thread]);

  return (
    <Components.Comments.Card
      className={"bn-thread"}
      onFocus={() => {
        if (view === "floating") {
          return;
        }

        comments.selectThread(thread.id);
      }}
      onBlur={(event) => {
        if (view === "floating") {
          return;
        }

        if (
          !(event.relatedTarget instanceof Node) ||
          !(event.target instanceof Node) ||
          !event.target.contains(event.relatedTarget)
        ) {
          setShowAllComments(
            thread.comments.length <= (maxCommentsBeforeCollapse || 5)
          );
          comments.selectThread(undefined);
        }
      }}
      selected={selected}
      tabIndex={view === "sidebar" ? 0 : undefined}>
      <Components.Comments.CardSection className="bn-thread-comments">
        {commentElements}
        {thread.resolved && (
          <Components.Comments.Comment
            className={"bn-thread-comment"}
            authorInfo={users.get(thread.resolvedBy!)!}
            timeString={thread.resolvedUpdatedAt!.toLocaleDateString(
              undefined,
              {
                month: "short",
                day: "numeric",
              }
            )}
            edited={false}
            showActions={false}>
            <div className={"bn-resolved-text"}>Marked as resolved</div>
          </Components.Comments.Comment>
        )}
      </Components.Comments.CardSection>
      {selected && (
        <Components.Comments.CardSection>
          <CommentEditor
            autoFocus={false}
            editable={true}
            editor={newCommentEditor}
            actions={({ isEmpty }) => {
              if (isEmpty) {
                return null;
              }

              return (
                <Components.Generic.Toolbar.Root
                  variant="action-toolbar"
                  className={mergeCSSClasses(
                    "bn-action-toolbar",
                    "bn-comment-actions"
                  )}>
                  <Components.Generic.Toolbar.Button
                    mainTooltip="Save"
                    variant="compact"
                    isDisabled={isEmpty}
                    onClick={onNewCommentSave}>
                    Save
                  </Components.Generic.Toolbar.Button>
                </Components.Generic.Toolbar.Root>
              );
            }}
          />
        </Components.Comments.CardSection>
      )}
    </Components.Comments.Card>
  );
};
