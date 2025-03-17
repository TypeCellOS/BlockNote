import { mergeCSSClasses } from "@blocknote/core";
import { ThreadData } from "@blocknote/core/comments";
import { FocusEvent, useCallback, useMemo } from "react";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useCreateBlockNote } from "../../hooks/useCreateBlockNote.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { CommentEditor } from "./CommentEditor.js";
import { Comments } from "./Comments.js";
import { schema } from "./schema.js";
import { useUsers } from "./useUsers.js";

export type ThreadProps = {
  /**
   * TODO: DOCS
   */
  thread: ThreadData;
  selected?: boolean;
  referenceText?: string;
  maxCommentsBeforeCollapse?: number;
  onFocus?: () => void;
  onBlur?: (event: FocusEvent) => void;
  tabIndex?: number;
};

/**
 * The Thread component displays a (main) comment with a list of replies (other comments).
 *
 * It also includes a composer to reply to the thread.
 */
export const Thread = ({
  thread,
  selected,
  referenceText,
  maxCommentsBeforeCollapse,
  onFocus,
  onBlur,
  tabIndex,
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
    sideMenuDetection: "editor",
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

  return (
    <Components.Comments.Card
      className={"bn-thread"}
      headerText={referenceText}
      onFocus={onFocus}
      onBlur={onBlur}
      selected={selected}
      tabIndex={tabIndex}>
      <Components.Comments.CardSection className="bn-thread-comments">
        <Comments
          thread={thread}
          collapse={
            !selected &&
            thread.comments.length > (maxCommentsBeforeCollapse || 5)
          }
        />
        {thread.resolved && (
          <Components.Comments.Comment
            className={"bn-thread-comment"}
            authorInfo={users.get(thread.resolvedBy!) || "loading"}
            timeString={thread.resolvedUpdatedAt!.toLocaleDateString(
              undefined,
              {
                month: "short",
                day: "numeric",
              }
            )}
            edited={false}
            showActions={false}>
            <div className={"bn-resolved-text"}>
              {dict.comments.sidebar.marked_as_resolved}
            </div>
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
