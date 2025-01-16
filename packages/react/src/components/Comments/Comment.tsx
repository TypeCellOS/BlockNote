"use client";

import { CommentData, ThreadData, mergeCSSClasses } from "@blocknote/core";
import type { ComponentPropsWithoutRef, MouseEvent, ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useCreateBlockNote } from "../../hooks/useCreateBlockNote.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { CommentEditor } from "./CommentEditor.js";
import { schema } from "./schema.js";

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

  const onReactionSelect = useCallback(() => {
    console.log("reaction select");
  }, []);

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

  if (!showDeleted && !comment.body) {
    return null;
  }

  let actions: ReactNode | undefined = undefined;

  if (showActions && !isEditing) {
    actions = (
      <Components.Generic.Toolbar.Root
        className={mergeCSSClasses("bn-comment-actions", "bn-toolbar")}>
        {additionalActions ?? null}
        <Components.Generic.Toolbar.Button
          mainTooltip="Add reaction"
          variant="compact"
          onClick={onReactionSelect}>
          R1
        </Components.Generic.Toolbar.Button>
        {showResolveAction &&
          (thread.resolved ? (
            <Components.Generic.Toolbar.Button
              mainTooltip="Re-open"
              variant="compact"
              onClick={onReopen}>
              R2
            </Components.Generic.Toolbar.Button>
          ) : (
            <Components.Generic.Toolbar.Button
              mainTooltip="Resolve"
              variant="compact"
              onClick={onResolve}>
              R2
            </Components.Generic.Toolbar.Button>
          ))}
        <Components.Generic.Menu.Root>
          <Components.Generic.Menu.Trigger>
            <Components.Generic.Toolbar.Button
              mainTooltip="More actions"
              variant="compact">
              ...
            </Components.Generic.Toolbar.Button>
          </Components.Generic.Menu.Trigger>
          <Components.Generic.Menu.Dropdown className={"bn-menu-dropdown"}>
            <Components.Generic.Menu.Item onClick={handleEdit}>
              Edit comment
            </Components.Generic.Menu.Item>
            <Components.Generic.Menu.Item onClick={onDelete}>
              Delete comment
            </Components.Generic.Menu.Item>
          </Components.Generic.Menu.Dropdown>
        </Components.Generic.Menu.Root>
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
      authorInfo={{
        username: "hello world",
        avatarUrl:
          "https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/avatars/avatar-2.png",
      }}
      timeString={timeString}
      showActions={showActions}
      actions={actions}>
      {isEditing ? (
        <>
          <CommentEditor
            editor={commentEditor}
            editable={true}
            actions={({ isEmpty }) => (
              <Components.Generic.Toolbar.Root
                variant="action-toolbar"
                className={mergeCSSClasses("bn-comment-actions")}>
                <Components.Generic.Toolbar.Button
                  mainTooltip="Cancel"
                  variant="compact"
                  onClick={onEditCancel}>
                  X
                </Components.Generic.Toolbar.Button>
                <Components.Generic.Toolbar.Button
                  mainTooltip="Save"
                  variant="compact"
                  onClick={onEditSubmit}
                  isDisabled={isEmpty}>
                  Save
                </Components.Generic.Toolbar.Button>
              </Components.Generic.Toolbar.Root>
            )}
          />
        </>
      ) : comment.body ? (
        <>
          <CommentEditor editor={commentEditor} editable={false} />

          {showReactions && comment.reactions.length > 0 && (
            <div className="bn-comment-reactions"></div>
          )}
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
