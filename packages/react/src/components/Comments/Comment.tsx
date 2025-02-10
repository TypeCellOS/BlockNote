"use client";

import { CommentData, ThreadData, mergeCSSClasses } from "@blocknote/core";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import type { EmojiData } from "emoji-mart";
import {
  ComponentPropsWithoutRef,
  MouseEvent,
  ReactNode,
  useCallback,
  useEffect,
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

/**
 * Liveblocks, but changed:
 * - removed attachments
 * - removed read status
 * ...
 */
// const REACTIONS_TRUNCATE = 5;

export interface CommentProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * The comment to display.
   */
  comment: CommentData;

  /**
   * The thread id.
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

  /**
   * @internal
   */
  additionalActions?: ReactNode;
}

// interface CommentReactionButtonProps
//   extends ComponentPropsWithoutRef<typeof Button> {
//   reaction: CommentReactionData;
//   // overrides?: Partial<GlobalOverrides & CommentOverrides>;
// }

// interface CommentReactionProps extends ComponentPropsWithoutRef<"button"> {
//   comment: CommentData;
//   reaction: CommentReactionData;
//   // overrides?: Partial<GlobalOverrides & CommentOverrides>;
// }

// type CommentNonInteractiveReactionProps = Omit<CommentReactionProps, "comment">;

// const CommentReactionButton = forwardRef<
//   HTMLButtonElement,
//   CommentReactionButtonProps
// >(({ reaction, overrides, className, ...props }, forwardedRef) => {
//   const $ = useOverrides(overrides);
//   return (
//     <Button
//       className={classNames("lb-comment-reaction", className)}
//       variant="outline"
//       aria-label={$.COMMENT_REACTION_DESCRIPTION(
//         reaction.emoji,
//         reaction.users.length
//       )}
//       {...props}
//       ref={forwardedRef}>
//       <Emoji className="lb-comment-reaction-emoji" emoji={reaction.emoji} />
//       <span className="lb-comment-reaction-count">{reaction.users.length}</span>
//     </Button>
//   );
// });

// export const CommentReaction = forwardRef<
//   HTMLButtonElement,
//   CommentReactionProps
// >(({ comment, reaction, overrides, disabled, ...props }, forwardedRef) => {
//   const addReaction = useAddRoomCommentReaction(comment.roomId);
//   const removeReaction = useRemoveRoomCommentReaction(comment.roomId);
//   const currentId = useCurrentUserId();
//   const isActive = useMemo(() => {
//     return reaction.users.some((users) => users.id === currentId);
//   }, [currentId, reaction]);
//   const $ = useOverrides(overrides);
//   const tooltipContent = useMemo(
//     () => (
//       <span>
//         {$.COMMENT_REACTION_LIST(
//           <List
//             values={reaction.users.map((users) => (
//               <User key={users.id} userId={users.id} replaceSelf />
//             ))}
//             formatRemaining={$.LIST_REMAINING_USERS}
//             truncate={REACTIONS_TRUNCATE}
//             locale={$.locale}
//           />,
//           reaction.emoji,
//           reaction.users.length
//         )}
//       </span>
//     ),
//     [$, reaction]
//   );

//   const stopPropagation = useCallback((event: SyntheticEvent) => {
//     event.stopPropagation();
//   }, []);

//   const handlePressedChange = useCallback(
//     (isPressed: boolean) => {
//       if (isPressed) {
//         addReaction({
//           threadId: comment.threadId,
//           commentId: comment.id,
//           emoji: reaction.emoji,
//         });
//       } else {
//         removeReaction({
//           threadId: comment.threadId,
//           commentId: comment.id,
//           emoji: reaction.emoji,
//         });
//       }
//     },
//     [addReaction, comment.threadId, comment.id, reaction.emoji, removeReaction]
//   );

//   return (
//     <Tooltip
//       content={tooltipContent}
//       multiline
//       className="lb-comment-reaction-tooltip">
//       <TogglePrimitive.Root
//         asChild
//         pressed={isActive}
//         onPressedChange={handlePressedChange}
//         onClick={stopPropagation}
//         disabled={disabled}
//         ref={forwardedRef}>
//         <CommentReactionButton
//           data-self={isActive ? "" : undefined}
//           reaction={reaction}
//           overrides={overrides}
//           {...props}
//         />
//       </TogglePrimitive.Root>
//     </Tooltip>
//   );
// });

// export const CommentNonInteractiveReaction = forwardRef<
//   HTMLButtonElement,
//   CommentNonInteractiveReactionProps
// >(({ reaction, overrides, ...props }, forwardedRef) => {
//   const currentId = useCurrentUserId();
//   const isActive = useMemo(() => {
//     return reaction.users.some((users) => users.id === currentId);
//   }, [currentId, reaction]);

//   return (
//     <CommentReactionButton
//       disableable={false}
//       data-self={isActive ? "" : undefined}
//       reaction={reaction}
//       overrides={overrides}
//       {...props}
//       ref={forwardedRef}
//     />
//   );
// });

export const Comment = ({
  comment,
  thread,
  showDeleted,
  showActions = "hover",
  showReactions = true,
  showResolveAction = false,
  className,
  additionalActions,
}: CommentProps) => {
  const dict = useDictionary();

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

  // const currentUserId = useCurrentUserId();
  // const deleteComment = useDeleteRoomComment(comment.roomId);
  // const editComment = useEditRoomComment(com ment.roomId);
  // const addReaction = useAddRoomCommentReaction(comment.roomId);
  // const removeReaction = useRemoveRoomCommentReaction(comment.roomId);
  // const $ = useOverrides(overrides);
  const [isEditing, setEditing] = useState(false);
  const [isTarget, setTarget] = useState(false);
  const [isMoreActionOpen, setMoreActionOpen] = useState(false);
  const [isReactionActionOpen, setReactionActionOpen] = useState(false);

  const editor = useBlockNoteEditor();

  const handleEdit = useCallback(() => {
    setEditing(true);
  }, []);

  const onEditCancel = useCallback(() => {
    commentEditor.replaceBlocks(commentEditor.document, comment.body);
    setEditing(false);
  }, [commentEditor, comment.body]);

  const onEditSubmit = useCallback(
    async (_event: MouseEvent) => {
      await editor.comments!.store.updateComment({
        commentId: comment.id,
        comment: {
          body: commentEditor.document,
        },
        threadId: thread.id,
      });

      setEditing(false);
    },
    [comment, thread.id, commentEditor, editor.comments]
  );

  const onDelete = useCallback(() => {
    editor.comments!.store.deleteComment({
      commentId: comment.id,
      threadId: thread.id,
    });
  }, [comment, thread.id, editor.comments]);

  const onReactionSelect = useCallback(
    (emoji: string) => {
      editor.comments?.store.toggleReaction({
        threadId: thread.id,
        commentId: comment.id,
        reaction: emoji,
      });
    },
    [comment.id, editor.comments?.store, thread.id]
  );

  const onResolve = useCallback(() => {
    editor.comments!.store.resolveThread({
      threadId: thread.id,
    });
  }, [thread.id, editor.comments]);

  const onReopen = useCallback(() => {
    editor.comments!.store.unresolveThread({
      threadId: thread.id,
    });
  }, [thread.id, editor.comments]);

  useEffect(() => {
    const isWindowDefined = typeof window !== "undefined";
    if (!isWindowDefined) {
      return;
    }

    const hash = window.location.hash;
    const commentId = hash.slice(1);

    if (commentId === comment.id) {
      setTarget(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const user = useUser(editor, comment.userId);

  const blockNoteContext = useBlockNoteContext();

  if (!showDeleted && !comment.body) {
    return null;
  }

  let actions: ReactNode | undefined = undefined;
  const canAddReaction = true; //editor.comments!.store.auth.canAddReaction(comment);
  const canDeleteComment =
    editor.comments!.store.auth.canDeleteComment(comment);
  const canEditComment = editor.comments!.store.auth.canUpdateComment(comment);

  const showResolveOrReopen =
    showResolveAction &&
    (thread.resolved
      ? editor.comments!.store.auth.canUnresolveThread(thread)
      : editor.comments!.store.auth.canResolveThread(thread));

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
                onEmojiSelect={(emoji: EmojiData) =>
                  onReactionSelect(emoji.native)
                }
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
      : ""); // TODO: needs editedAt?

  return (
    <Components.Comments.Comment
      authorInfo={user ?? "loading"}
      timeString={timeString}
      showActions={showActions}
      actions={actions}>
      {comment.body ? (
        <>
          <CommentEditor
            editor={commentEditor}
            editable={true}
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
                          onEmojiSelect={(emoji: EmojiData) =>
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
