import { mergeCSSClasses } from "@blocknote/core";
import type { ComponentPropsWithoutRef } from "react";
import { useCallback, useMemo } from "react";
import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useCreateBlockNote } from "../../hooks/useCreateBlockNote.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { Comment, CommentProps } from "./Comment.js";
import { CommentEditor } from "./CommentEditor.js";
import { schema } from "./schema.js";
import { useThreads } from "./useThreads.js";
import { useUsers } from "./useUsers.js";

export interface ThreadProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * The thread to display.
   */
  threadId: string;

  /**
   * Whether to show the composer to reply to the thread.
   */
  showComposer?: boolean;

  /**
   * Whether to show the action to resolve the thread.
   */
  showResolveAction?: boolean;

  /**
   * How to show or hide the actions.
   */
  showActions?: CommentProps["showActions"];

  /**
   * Whether to show reactions.
   */
  showReactions?: CommentProps["showReactions"];

  /**
   * Whether to show deleted comments.
   */
  showDeletedComments?: CommentProps["showDeleted"];
}

/**
 * The Thread component displays a (main) comment with a list of replies (other comments).
 *
 * It also includes a composer to reply to the thread.
 */
export const Thread = ({
  threadId,
  showActions = "hover",
  showDeletedComments,
  showResolveAction = true,
  showReactions = true,
  showComposer = true,
  className,
  ...props
}: ThreadProps) => {
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const threadMap = useThreads(editor);
  const thread = threadMap.get(threadId);

  if (!thread) {
    throw new Error("Thread not found");
  }

  const userIds = useMemo(() => {
    return thread.comments.flatMap((c) => [
      c.userId,
      ...c.reactions.flatMap((r) => r.userIds),
    ]);
  }, [thread.comments]);

  // load all user data
  useUsers(editor, userIds);

  // TODO: review use of sub-editor
  const newCommentEditor = useCreateBlockNote({
    trailingBlock: false,
    dictionary: {
      ...dict,
      placeholders: {
        ...dict.placeholders,
        default: "Add comment...", // TODO: only for empty doc
      },
    },
    schema,
  });

  const firstCommentIndex = useMemo(() => {
    return showDeletedComments
      ? 0
      : thread.comments.findIndex((comment) => comment.body);
  }, [showDeletedComments, thread.comments]);

  const onNewCommentSave = useCallback(async () => {
    // TODO: show error on failure?
    await editor.comments!.store.addComment({
      comment: {
        body: newCommentEditor.document,
      },
      threadId: thread.id,
    });

    // reset editor
    newCommentEditor.removeBlocks(newCommentEditor.document);
  }, [editor.comments, newCommentEditor, thread.id]);

  showComposer =
    showComposer && editor.comments!.store.auth.canAddComment(thread);

  return (
    <Components.Comments.Card
      className={mergeCSSClasses("bn-thread", className)}
      {...props}>
      <Components.Comments.CardSection className="bn-thread-comments">
        {thread.comments.map((comment, index) => {
          const isFirstComment = index === firstCommentIndex;

          return (
            <Comment
              key={comment.id}
              thread={thread}
              className="bn-thread-comment"
              comment={comment}
              showDeleted={showDeletedComments}
              showActions={showActions}
              showReactions={showReactions}
              showResolveAction={isFirstComment}
            />
          );
        })}
      </Components.Comments.CardSection>
      {showComposer && (
        <Components.Comments.CardSection>
          <CommentEditor
            editable={true}
            editor={newCommentEditor}
            actions={({ isFocused, isEmpty }) => {
              if (!isFocused && isEmpty) {
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
