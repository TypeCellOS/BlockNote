"use client";

import { CommentData, ThreadData, mergeCSSClasses } from "@blocknote/core";
import {
  ComponentPropsWithoutRef,
  MouseEvent,
  ReactNode,
  useCallback,
  useState,
} from "react";
import {
  RiArrowGoBackFill,
  RiCheckFill,
  RiDeleteBinFill,
  RiEditFill,
  RiEmotionLine,
  RiMoreFill,
} from "react-icons/ri";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useCreateBlockNote } from "../../hooks/useCreateBlockNote.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { CommentEditor } from "./CommentEditor.js";
import { EmojiPicker } from "./EmojiPicker.js";
import { ReactionBadge } from "./ReactionBadge.js";
import { schema } from "./schema.js";
import { useUser } from "./useUsers.js";

export interface CommentProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * The comment to display.
   */
  comment: CommentData;

  /**
   * The thread the comment belongs to.
   */
  thread: ThreadData;

  /**
   * How to show or hide the actions.
   */
  showActions?: boolean | "hover";

  /**
   * Whether to show the resolve action.
   */
  showResolveAction?: boolean;

  /**
   * Whether to show the comment if it was deleted. If set to `false`, it will render deleted comments as `null`.
   */
  showDeleted?: boolean;

  /**
   * Whether to show reactions.
   */
  showReactions?: boolean;
}

/**
 * The Comment component displays a single comment with actions,
 * a reaction list and an editor when editing.
 *
 * It's generally used in the `Thread` component for comments that have already been created.
 *
 */
export const Comment = ({
  comment,
  thread,
  showDeleted,
  showActions = "hover",
  showReactions = true,
  showResolveAction = false,
  className,
}: CommentProps) => {
  // TODO: if REST API becomes popular, all interactions (click handlers) should implement a loading state and error state
  // (or optimistic local updates)

  const dict = useDictionary();

  const commentEditor = useCreateBlockNote(
    {
      initialContent: comment.body,
      trailingBlock: false,
      dictionary: {
        ...dict,
        placeholders: {
          emptyDocument: dict.placeholders.edit_comment,
        },
      },
      schema,
    },
    [comment.body]
  );

  const Components = useComponentsContext()!;

  const [isEditing, setEditing] = useState(false);

  const editor = useBlockNoteEditor();

  if (!editor.comments) {
    throw new Error("Comments plugin not found");
  }

  const threadStore = editor.comments.threadStore;

  const handleEdit = useCallback(() => {
    setEditing(true);
  }, []);

  const onEditCancel = useCallback(() => {
    commentEditor.replaceBlocks(commentEditor.document, comment.body);
    setEditing(false);
  }, [commentEditor, comment.body]);

  const onEditSubmit = useCallback(
    async (_event: MouseEvent) => {
      await threadStore.updateComment({
        commentId: comment.id,
        comment: {
          body: commentEditor.document,
        },
        threadId: thread.id,
      });

      setEditing(false);
    },
    [comment, thread.id, commentEditor, threadStore]
  );

  const onDelete = useCallback(async () => {
    await threadStore.deleteComment({
      commentId: comment.id,
      threadId: thread.id,
    });
  }, [comment, thread.id, threadStore]);

  const onReactionSelect = useCallback(
    async (emoji: string) => {
      if (threadStore.auth.canAddReaction(comment, emoji)) {
        await threadStore.addReaction({
          threadId: thread.id,
          commentId: comment.id,
          emoji,
        });
      } else if (threadStore.auth.canDeleteReaction(comment, emoji)) {
        await threadStore.deleteReaction({
          threadId: thread.id,
          commentId: comment.id,
          emoji,
        });
      }
    },
    [threadStore, comment, thread.id]
  );

  const onResolve = useCallback(async () => {
    await threadStore.resolveThread({
      threadId: thread.id,
    });
  }, [thread.id, threadStore]);

  const onReopen = useCallback(async () => {
    await threadStore.unresolveThread({
      threadId: thread.id,
    });
  }, [thread.id, threadStore]);

  const user = useUser(editor, comment.userId);

  if (!showDeleted && !comment.body) {
    return null;
  }

  let actions: ReactNode | undefined = undefined;
  const canAddReaction = threadStore.auth.canAddReaction(comment);
  const canDeleteComment = threadStore.auth.canDeleteComment(comment);
  const canEditComment = threadStore.auth.canUpdateComment(comment);

  const showResolveOrReopen =
    showResolveAction &&
    (thread.resolved
      ? threadStore.auth.canUnresolveThread(thread)
      : threadStore.auth.canResolveThread(thread));

  if (showActions && !isEditing) {
    actions = (
      <Components.Generic.Toolbar.Root
        className={mergeCSSClasses("bn-action-toolbar", "bn-comment-actions")}
        variant={"action-toolbar"}>
        {canAddReaction && (
          <EmojiPicker
            onEmojiSelect={(emoji: { native: string }) =>
              onReactionSelect(emoji.native)
            }>
            <Components.Generic.Toolbar.Button
              key={"add-reaction"}
              mainTooltip={dict.comments.actions.add_reaction}
              variant="compact">
              <RiEmotionLine size={16} />
            </Components.Generic.Toolbar.Button>
          </EmojiPicker>
        )}
        {showResolveOrReopen &&
          (thread.resolved ? (
            <Components.Generic.Toolbar.Button
              key={"reopen"}
              mainTooltip="Re-open"
              variant="compact"
              onClick={onReopen}>
              <RiArrowGoBackFill size={16} />
            </Components.Generic.Toolbar.Button>
          ) : (
            <Components.Generic.Toolbar.Button
              key={"resolve"}
              mainTooltip={dict.comments.actions.resolve}
              variant="compact"
              onClick={onResolve}>
              <RiCheckFill size={16} />
            </Components.Generic.Toolbar.Button>
          ))}
        {(canDeleteComment || canEditComment) && (
          <Components.Generic.Menu.Root position={"bottom-start"}>
            <Components.Generic.Menu.Trigger>
              <Components.Generic.Toolbar.Button
                key={"more-actions"}
                mainTooltip={dict.comments.actions.more_actions}
                variant="compact">
                <RiMoreFill size={16} />
              </Components.Generic.Toolbar.Button>
            </Components.Generic.Menu.Trigger>
            <Components.Generic.Menu.Dropdown className={"bn-menu-dropdown"}>
              {canEditComment && (
                <Components.Generic.Menu.Item
                  key={"edit-comment"}
                  icon={<RiEditFill />}
                  onClick={handleEdit}>
                  {dict.comments.actions.edit_comment}
                </Components.Generic.Menu.Item>
              )}
              {canDeleteComment && (
                <Components.Generic.Menu.Item
                  key={"delete-comment"}
                  icon={<RiDeleteBinFill />}
                  onClick={onDelete}>
                  {dict.comments.actions.delete_comment}
                </Components.Generic.Menu.Item>
              )}
            </Components.Generic.Menu.Dropdown>
          </Components.Generic.Menu.Root>
        )}
      </Components.Generic.Toolbar.Root>
    );
  }

  const timeString =
    comment.createdAt.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }) +
    (comment.updatedAt.getTime() !== comment.createdAt.getTime()
      ? " (edited)"
      : "");

  if (!comment.body) {
    throw new Error("soft deletes are not yet supported");
  }

  return (
    <Components.Comments.Comment
      authorInfo={user ?? "loading"}
      timeString={timeString}
      showActions={showActions}
      actions={actions}
      className={className}>
      <CommentEditor
        editor={commentEditor}
        editable={isEditing}
        actions={
          (showReactions && comment.reactions.length > 0) || isEditing
            ? ({ isEmpty }) => (
                <>
                  {showReactions &&
                    comment.reactions.length > 0 &&
                    !isEditing && (
                      <Components.Generic.Badge.Group
                        className={mergeCSSClasses(
                          "bn-badge-group",
                          "bn-comment-reactions"
                        )}>
                        {comment.reactions.map((reaction) => (
                          <ReactionBadge
                            comment={comment}
                            emoji={reaction.emoji}
                            onReactionSelect={onReactionSelect}
                          />
                        ))}
                        <EmojiPicker
                          onEmojiSelect={(emoji: { native: string }) =>
                            onReactionSelect(emoji.native)
                          }>
                          <Components.Generic.Badge.Root
                            className={mergeCSSClasses(
                              "bn-badge",
                              "bn-comment-add-reaction"
                            )}
                            text={"+"}
                            icon={<RiEmotionLine size={16} />}
                            mainTooltip={dict.comments.actions.add_reaction}
                          />
                        </EmojiPicker>
                      </Components.Generic.Badge.Group>
                    )}
                  {isEditing && (
                    <Components.Generic.Toolbar.Root
                      variant="action-toolbar"
                      className={mergeCSSClasses(
                        "bn-action-toolbar",
                        "bn-comment-actions"
                      )}>
                      <Components.Generic.Toolbar.Button
                        mainTooltip="Save"
                        variant="compact"
                        onClick={onEditSubmit}
                        isDisabled={isEmpty}>
                        Save
                      </Components.Generic.Toolbar.Button>
                      <Components.Generic.Toolbar.Button
                        className={"bn-button"}
                        mainTooltip="Cancel"
                        variant="compact"
                        onClick={onEditCancel}>
                        Cancel
                      </Components.Generic.Toolbar.Button>
                    </Components.Generic.Toolbar.Root>
                  )}
                </>
              )
            : undefined
        }
      />
    </Components.Comments.Comment>
  );
};
