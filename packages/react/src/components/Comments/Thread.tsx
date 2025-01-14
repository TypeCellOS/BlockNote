"use client";

import { ThreadData, mergeCSSClasses } from "@blocknote/core";
import type { ComponentPropsWithoutRef, ForwardedRef } from "react";
import { forwardRef, useCallback, useMemo } from "react";
import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useCreateBlockNote } from "../../hooks/useCreateBlockNote.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { Comment, CommentProps } from "./Comment.js";
import { schema } from "./schema.js";

export interface ThreadProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * The thread to display.
   */
  thread: ThreadData;

  /**
   * How to show or hide the composer to reply to the thread.
   */
  showComposer?: boolean | "collapsed";

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
   * Whether to show the composer's formatting controls.
   */
  //   showComposerFormattingControls?: ComposerProps["showFormattingControls"];

  /**
   * Whether to indent the comments' content.
   */
  indentCommentContent?: CommentProps["indentContent"];

  /**
   * Whether to show deleted comments.
   */
  showDeletedComments?: CommentProps["showDeleted"];

  /**
   * Whether to show attachments.
   */
  showAttachments?: boolean;

  /**
   * The event handler called when changing the resolved status.
   */
  onResolvedChange?: (resolved: boolean) => void;

  /**
   * The event handler called when a comment is edited.
   */
  onCommentEdit?: CommentProps["onCommentEdit"];

  /**
   * The event handler called when a comment is deleted.
   */
  onCommentDelete?: CommentProps["onCommentDelete"];

  /**
   * The event handler called when the thread is deleted.
   * A thread is deleted when all its comments are deleted.
   */
  onThreadDelete?: (thread: ThreadData) => void;

  /**
   * The event handler called when clicking on a comment's author.
   */
  onAuthorClick?: CommentProps["onAuthorClick"];

  /**
   * The event handler called when clicking on a mention.
   */
  onMentionClick?: CommentProps["onMentionClick"];

  /**
   * The event handler called when clicking on a comment's attachment.
   */
  //   onAttachmentClick?: CommentProps["onAttachmentClick"];

  /**
   * The event handler called when the composer is submitted.
   */
  //   onComposerSubmit?: ComposerProps["onComposerSubmit"];

  /**
   * Override the component's strings.
   */
  //   overrides?: Partial<
  //     GlobalOverrides & ThreadOverrides & CommentOverrides & ComposerOverrides
  //   >;
}

/**
 * Displays a thread of comments, with a composer to reply
 * to it.
 *
 * @example
 * <>
 *   {threads.map((thread) => (
 *     <Thread key={thread.id} thread={thread} />
 *   ))}
 * </>
 */
export const Thread = forwardRef(
  (
    {
      thread,
      indentCommentContent = true,
      showActions = "hover",
      showDeletedComments,
      showResolveAction = true,
      showReactions = true,
      showComposer = "collapsed",
      showAttachments = true,
      //   showComposerFormattingControls = true,
      onResolvedChange,
      onCommentEdit,
      onCommentDelete,
      onThreadDelete,
      onAuthorClick,
      onMentionClick,
      //   onAttachmentClick,
      //   onComposerSubmit,
      //   overrides,
      className,
      ...props
    }: ThreadProps,
    forwardedRef: ForwardedRef<HTMLDivElement>
  ) => {
    // const markThreadAsResolved = useMarkRoomThreadAsResolved(thread.roomId);
    // const markThreadAsUnresolved = useMarkRoomThreadAsUnresolved(thread.roomId);

    const ctx = useComponentsContext()!;
    const dict = useDictionary();
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

    const stopPropagation = useCallback((event: SyntheticEvent) => {
      event.stopPropagation();
    }, []);

    // const handleResolvedChange = useCallback(
    //   (resolved: boolean) => {
    //     onResolvedChange?.(resolved);

    //     if (resolved) {
    //       markThreadAsResolved(thread.id);
    //     } else {
    //       markThreadAsUnresolved(thread.id);
    //     }
    //   },
    //   [
    //     markThreadAsResolved,
    //     markThreadAsUnresolved,
    //     onResolvedChange,
    //     thread.id,
    //   ]
    // );

    // TODO: thread deletion

    // const handleCommentDelete = useCallback(
    //   (comment: Comment) => {
    //     onCommentDelete?.(comment);

    //     const filteredComments = thread.comments.filter(
    //       (comment) => comment.body
    //     );

    //     if (filteredComments.length <= 1) {
    //       onThreadDelete?.(thread);
    //     }
    //   },
    //   [onCommentDelete, onThreadDelete, thread]
    // );

    //  TODO: extract component
    return (
      <ctx.Comments.Card
        className={mergeCSSClasses(
          "lb-root lb-thread",
          showActions === "hover" && "lb-thread:show-actions-hover",
          className
        )}
        // data-resolved={thread.resolved ? "" : undefined} TODO
        {...props}
        ref={forwardedRef}>
        <ctx.Comments.CardSection className="lb-thread-comments">
          {thread.comments.map((comment, index) => {
            const isFirstComment = index === firstCommentIndex;

            return (
              <Comment
                key={comment.id}
                className="lb-thread-comment"
                comment={comment}
                indentContent={indentCommentContent}
                showDeleted={showDeletedComments}
                showActions={showActions}
                showReactions={showReactions}
                // showAttachments={showAttachments}
                // showComposerFormattingControls={showComposerFormattingControls}
                onCommentEdit={onCommentEdit}
                onCommentDelete={onCommentDelete}
                onAuthorClick={onAuthorClick}
                onMentionClick={onMentionClick}
                // onAttachmentClick={onAttachmentClick}
                additionalActionsClassName={
                  isFirstComment ? "lb-thread-actions" : undefined
                }
                // additionalActions={
                //   isFirstComment && showResolveAction ? (
                //     <Tooltip
                //       content={
                //         thread.resolved ? $.THREAD_UNRESOLVE : $.THREAD_RESOLVE
                //       }>
                //       <TogglePrimitive.Root
                //         pressed={thread.resolved}
                //         onPressedChange={handleResolvedChange}
                //         asChild>
                //         <Button
                //           className="lb-comment-action"
                //           onClick={stopPropagation}
                //           aria-label={
                //             thread.resolved
                //               ? $.THREAD_UNRESOLVE
                //               : $.THREAD_RESOLVE
                //           }>
                //           {thread.resolved ? (
                //             <ResolvedIcon className="lb-button-icon" />
                //           ) : (
                //             <ResolveIcon className="lb-button-icon" />
                //           )}
                //         </Button>
                //       </TogglePrimitive.Root>
                //     </Tooltip>
                //   ) : null
                // }
              />
            );
          })}
        </ctx.Comments.CardSection>
        <ctx.Comments.CardSection>
          {/* {showComposer && (
          <Composer
            // className="lb-thread-composer"
            threadId={thread.id}
            defaultCollapsed={showComposer === "collapsed" ? true : undefined}
            showAttachments={showAttachments}
            showFormattingControls={showComposerFormattingControls}
            onComposerSubmit={onComposerSubmit}
            // overrides={{
            //   COMPOSER_PLACEHOLDER: $.THREAD_COMPOSER_PLACEHOLDER,
            //   COMPOSER_SEND: $.THREAD_COMPOSER_SEND,
            // }}
            roomId={thread.roomId}
          />
        )} */}
          <ctx.Comments.Editor editable={true} editor={newCommentEditor} />
        </ctx.Comments.CardSection>
      </ctx.Comments.Card>
    );
  }
) as (props: ThreadProps & RefAttributes<HTMLDivElement>) => JSX.Element;
