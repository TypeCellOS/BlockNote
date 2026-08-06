import { BlockNoteEditor, Dictionary, mergeCSSClasses } from "@blocknote/core";
import { CommentsExtension } from "@blocknote/core/comments";
import { ThreadData } from "@blocknote/core/comments";
import { FocusEvent, memo, useCallback } from "react";

import {
  Components,
  useComponentsContext,
} from "../../editor/ComponentsContext.js";
import { useCreateBlockNote } from "../../hooks/useCreateBlockNote.js";
import { useExtension } from "../../hooks/useExtension.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { CommentEditor } from "./CommentEditor.js";
import { Comments } from "./Comments.js";
import { defaultCommentEditorSchema } from "./defaultCommentEditorSchema.js";

type ReplyActionsProps = {
  isFocused: boolean;
  isEmpty: boolean;
  onNewCommentSave: () => Promise<void>;
  Components: Components;
  dict: Dictionary;
};

const ReplyActionsComponent = memo(
  ({ isEmpty, onNewCommentSave, Components, dict }: ReplyActionsProps) => {
    if (isEmpty) {
      return null;
    }

    return (
      <Components.Generic.Toolbar.Root
        variant="action-toolbar"
        className={mergeCSSClasses("bn-action-toolbar", "bn-comment-actions")}
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
  },
);

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
   * A boolean flag for whether the thread is orphaned (i.e. the referenced text
   * has been deleted from the document). Adds a `bn-thread-orphaned` CSS class
   * to the thread.
   */
  orphaned?: boolean;
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
  /**
   * The editor used to compose a reply. Provided by `FloatingThreadController`
   * so it can check for unsaved text before discarding the floating card. When
   * omitted (e.g. in the sidebar), the thread creates its own.
   */
  newCommentEditor?: BlockNoteEditor<any, any, any>;
};

/**
 * The Thread component displays a (main) comment with a list of replies (other comments).
 *
 * It also includes a composer to reply to the thread.
 */
export const Thread = ({
  thread,
  selected,
  orphaned,
  referenceText,
  maxCommentsBeforeCollapse,
  onFocus,
  onBlur,
  tabIndex,
  newCommentEditor: providedNewCommentEditor,
}: ThreadProps) => {
  // TODO: if REST API becomes popular, all interactions (click handlers) should implement a loading state and error state
  // (or optimistic local updates)

  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const comments = useExtension(CommentsExtension);

  const ownNewCommentEditor = useCreateBlockNote({
    trailingBlock: false,
    dictionary: {
      ...dict,
      placeholders: {
        emptyDocument: dict.placeholders.comment_reply,
      },
    },
    schema: comments.commentEditorSchema || defaultCommentEditorSchema,
  });

  // Use the editor provided by the controller (which owns the dismiss
  // lifecycle and checks for unsaved text before discarding), falling back to
  // our own when the thread is rendered standalone (e.g. in the sidebar).
  const newCommentEditor = providedNewCommentEditor ?? ownNewCommentEditor;

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
      className={mergeCSSClasses("bn-thread", orphaned && "bn-thread-orphaned")}
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
            actions={({ isFocused, isEmpty }) => (
              <ReplyActionsComponent
                isFocused={isFocused}
                isEmpty={isEmpty}
                onNewCommentSave={onNewCommentSave}
                Components={Components}
                dict={dict}
              />
            )}
          />
        </Components.Comments.CardSection>
      )}
    </Components.Comments.Card>
  );
};
