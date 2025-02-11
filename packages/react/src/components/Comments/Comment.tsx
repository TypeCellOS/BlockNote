"use client";

import { CommentData, ThreadData, mergeCSSClasses } from "@blocknote/core";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

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
  RiEmotionFill,
  RiMoreFill,
} from "react-icons/ri";

import { useBlockNoteContext } from "../../editor/BlockNoteContext.js";
import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useCreateBlockNote } from "../../hooks/useCreateBlockNote.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { CommentEditor } from "./CommentEditor.js";
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
  const dict = useDictionary();

  // TODO: review use of sub-editor
  const commentEditor = useCreateBlockNote(
    {
      initialContent: comment.body,
      trailingBlock: false,
      dictionary: {
        ...dict,
        placeholders: {
          ...dict.placeholders,
          default: "Edit comment...", // TODO: only for empty doc
        },
      },
      schema,
    },
    [comment.body]
  );

  const Components = useComponentsContext()!;

  const [isEditing, setEditing] = useState(false);

  const editor = useBlockNoteEditor();

  const commentStore = editor.comments!.store;

  const handleEdit = useCallback(() => {
    setEditing(true);
  }, []);

  const onEditCancel = useCallback(() => {
    commentEditor.replaceBlocks(commentEditor.document, comment.body);
    setEditing(false);
  }, [commentEditor, comment.body]);

  const onEditSubmit = useCallback(
    async (_event: MouseEvent) => {
      // TODO: show error on failure?
      await commentStore.updateComment({
        commentId: comment.id,
        comment: {
          body: commentEditor.document,
        },
        threadId: thread.id,
      });

      setEditing(false);
    },
    [comment, thread.id, commentEditor, commentStore]
  );

  const onDelete = useCallback(async () => {
    // TODO: show error on failure?
    await commentStore.deleteComment({
      commentId: comment.id,
      threadId: thread.id,
    });
  }, [comment, thread.id, commentStore]);

  const onReactionSelect = useCallback(
    async (emoji: string) => {
      // TODO: show error on failure?
      await commentStore.addReaction({
        threadId: thread.id,
        commentId: comment.id,
        emoji,
      });
    },
    [comment.id, commentStore, thread.id]
  );

  const onResolve = useCallback(async () => {
    // TODO: show error on failure?
    await commentStore.resolveThread({
      threadId: thread.id,
    });
  }, [thread.id, commentStore]);

  const onReopen = useCallback(async () => {
    // TODO: show error on failure?
    await commentStore.unresolveThread({
      threadId: thread.id,
    });
  }, [thread.id, commentStore]);

  const user = useUser(editor, comment.userId);

  const blockNoteContext = useBlockNoteContext();

  if (!showDeleted && !comment.body) {
    return null;
  }

  let actions: ReactNode | undefined = undefined;
  const canAddReaction = commentStore.auth.canAddReaction(comment);
  const canDeleteComment = commentStore.auth.canDeleteComment(comment);
  const canEditComment = commentStore.auth.canUpdateComment(comment);

  const showResolveOrReopen =
    showResolveAction &&
    (thread.resolved
      ? commentStore.auth.canUnresolveThread(thread)
      : commentStore.auth.canResolveThread(thread));

  if (showActions && !isEditing) {
    actions = (
      <Components.Generic.Toolbar.Root
        className={mergeCSSClasses("bn-action-toolbar", "bn-comment-actions")}>
        {canAddReaction && (
          <Components.Generic.Popover.Root>
            <Components.Generic.Popover.Trigger>
              <Components.Generic.Toolbar.Button
                mainTooltip="Add reaction"
                variant="compact">
                <RiEmotionFill size={16} />
              </Components.Generic.Toolbar.Button>
            </Components.Generic.Popover.Trigger>
            <Components.Generic.Popover.Content variant={"form-popover"}>
              <Picker
                data={data}
                onEmojiSelect={(emoji: any) => onReactionSelect(emoji.native)}
                theme={blockNoteContext?.colorSchemePreference}
              />
            </Components.Generic.Popover.Content>
          </Components.Generic.Popover.Root>
        )}
        {showResolveOrReopen &&
          (thread.resolved ? (
            <Components.Generic.Toolbar.Button
              mainTooltip="Re-open"
              variant="compact"
              onClick={onReopen}>
              <RiArrowGoBackFill size={16} />
            </Components.Generic.Toolbar.Button>
          ) : (
            <Components.Generic.Toolbar.Button
              mainTooltip="Resolve"
              variant="compact"
              onClick={onResolve}>
              <RiCheckFill size={16} />
            </Components.Generic.Toolbar.Button>
          ))}
        {(canDeleteComment || canEditComment) && (
          <Components.Generic.Menu.Root>
            <Components.Generic.Menu.Trigger>
              <Components.Generic.Toolbar.Button
                mainTooltip="More actions"
                variant="compact">
                <RiMoreFill size={16} />
              </Components.Generic.Toolbar.Button>
            </Components.Generic.Menu.Trigger>
            <Components.Generic.Menu.Dropdown className={"bn-menu-dropdown"}>
              {canEditComment && (
                <Components.Generic.Menu.Item
                  icon={<RiEditFill />}
                  onClick={handleEdit}>
                  Edit comment
                </Components.Generic.Menu.Item>
              )}
              {canDeleteComment && (
                <Components.Generic.Menu.Item
                  icon={<RiDeleteBinFill />}
                  onClick={onDelete}>
                  Delete comment
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

  return (
    <Components.Comments.Comment
      authorInfo={user ?? "loading"}
      timeString={timeString}
      showActions={showActions}
      actions={actions}
      className={className}>
      {comment.body ? (
        <>
          <CommentEditor
            editor={commentEditor}
            editable={true} // TODO
            actions={({ isEmpty }) => (
              <>
                {showReactions && comment.reactions.length > 0 && (
                  <Components.Generic.Badge.Group
                    className={mergeCSSClasses(
                      "bn-badge-group",
                      "bn-comment-reactions"
                    )}>
                    {comment.reactions.map((reaction) => (
                      <Components.Generic.Badge.Root
                        key={reaction.emoji}
                        className={mergeCSSClasses(
                          "bn-badge",
                          "bn-comment-reaction"
                        )}
                        text={reaction.userIds.length.toString()}
                        icon={reaction.emoji}
                        isSelected={user && reaction.userIds.includes(user.id)}
                        onClick={() => onReactionSelect(reaction.emoji)}
                        mainTooltip={"Reacted by"}
                        secondaryTooltip={`${reaction.userIds.map(
                          (userId) => userId + "\n"
                        )}`}
                      />
                    ))}
                    <Components.Generic.Popover.Root>
                      <Components.Generic.Popover.Trigger>
                        <Components.Generic.Badge.Root
                          className={mergeCSSClasses(
                            "bn-badge",
                            "bn-comment-add-reaction"
                          )}
                          text={"+"}
                          icon={<RiEmotionFill size={16} />}
                        />
                      </Components.Generic.Popover.Trigger>
                      <Components.Generic.Popover.Content
                        variant={"form-popover"}>
                        <Picker
                          data={data}
                          onEmojiSelect={(emoji: any) =>
                            onReactionSelect(emoji.native)
                          }
                          theme={blockNoteContext?.colorSchemePreference}
                        />
                      </Components.Generic.Popover.Content>
                    </Components.Generic.Popover.Root>
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
            )}
          />
        </>
      ) : (
        // Soft deletes
        // TODO, test
        <div className="bn-comment-body">
          <p className="bn-comment-deleted">Deleted</p>
        </div>
      )}
    </Components.Comments.Comment>
  );
};
