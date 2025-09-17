import { mergeCSSClasses } from "@blocknote/core";
import { ThreadData } from "@blocknote/core/comments";
import { FocusEvent, useCallback } from "react";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useCreateBlockNote } from "../../hooks/useCreateBlockNote.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { CommentEditor } from "./CommentEditor.js";
import { Comments } from "./Comments.js";
import { defaultCommentEditorSchema } from "./defaultCommentEditorSchema.js";

export type ThreadProps = {
  /**
   * The thread to display - you can use the `useThreads` hook to retrieve a
   * `Map` of all threads in the editor, mapped by their IDs.
   */
  thread: ThreadData;
  /**
   * A boolean flag for whether the thread is selected. Selected threads show an
   * editor for replies, and add a `selected` CSS class to the thread.
   */
  selected?: boolean;
  /**
   * The text in the editor that the thread refers to. See the
   * [`ThreadsSidebar`](https://github.com/TypeCellOS/BlockNote/tree/main/packages/react/src/components/Comments/ThreadsSidebar.tsx#L137)
   * component to find out how to get this.
   */
  referenceText?: string;
  /**
   * The maximum number of comments that can be in a thread before the replies
   * get collapsed.
   */
  maxCommentsBeforeCollapse?: number;
  /**
   * A function to call when the thread is focused.
   */
  onFocus?: (event: FocusEvent) => void;
  /**
   * A function to call when the thread is blurred.
   */
  onBlur?: (event: FocusEvent) => void;
  /**
   * The tab index for the thread.
   */
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

  const newCommentEditor = useCreateBlockNote({
    trailingBlock: false,
    dictionary: {
      ...dict,
      placeholders: {
        emptyDocument: dict.placeholders.comment_reply,
      },
    },
    schema: editor.comments.commentEditorSchema || defaultCommentEditorSchema,
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
      tabIndex={tabIndex}
    >
      <Components.Comments.CardSection className="bn-thread-comments">
        <Comments
          thread={thread}
          maxCommentsBeforeCollapse={
            !selected ? maxCommentsBeforeCollapse || 5 : undefined
          }
        />
      </Components.Comments.CardSection>
      {selected && (
        <Components.Comments.CardSection className={"bn-thread-composer"}>
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
                    "bn-comment-actions",
                  )}
                >
                  <Components.Generic.Toolbar.Button
                    mainTooltip={dict.comments.save_button_text}
                    variant="compact"
                    isDisabled={isEmpty}
                    onClick={onNewCommentSave}
                  >
                    {dict.comments.save_button_text}
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
