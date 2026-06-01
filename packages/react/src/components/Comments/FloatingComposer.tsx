import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  Dictionary,
  InlineContentSchema,
  mergeCSSClasses,
  StyleSchema,
} from "@blocknote/core";
import { CommentsExtension } from "@blocknote/core/comments";
import { memo, useCallback } from "react";

import { Components, useComponentsContext } from "../../editor/ComponentsContext.js";
import { useCreateBlockNote } from "../../hooks/useCreateBlockNote.js";
import { useExtension } from "../../hooks/useExtension.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { CommentEditor } from "./CommentEditor.js";
import { defaultCommentEditorSchema } from "./defaultCommentEditorSchema.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { TextSelection } from "@tiptap/pm/state";

type FloatingComposerActionsProps = {
  isFocused: boolean;
  isEmpty: boolean;
  onSave: () => Promise<void>;
  Components: Components;
  dict: Dictionary;
};

const FloatingComposerActionsComponent = memo(
  ({ isEmpty, onSave, Components, dict }: FloatingComposerActionsProps) => (
    <Components.Generic.Toolbar.Root
      className={mergeCSSClasses("bn-action-toolbar", "bn-comment-actions")}
      variant="action-toolbar"
    >
      <Components.Generic.Toolbar.Button
        className={"bn-button"}
        mainTooltip={dict.comments.save_button_text}
        variant="compact"
        isDisabled={isEmpty}
        onClick={onSave}
      >
        {dict.comments.save_button_text}
      </Components.Generic.Toolbar.Button>
    </Components.Generic.Toolbar.Root>
  ),
);

/**
 * The FloatingComposer component displays a comment editor "floating" card.
 *
 * It's used when the user highlights a parts of the document to create a new comment / thread.
 */
export function FloatingComposer<
  B extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>() {
  const editor = useBlockNoteEditor<B, I, S>();

  const comments = useExtension(CommentsExtension);

  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const newCommentEditor = useCreateBlockNote({
    trailingBlock: false,
    dictionary: {
      ...dict,
      placeholders: {
        emptyDocument: dict.placeholders.new_comment,
      },
    },
    schema: comments.commentEditorSchema || defaultCommentEditorSchema,
  });

  const onSave = useCallback(async () => {
    // (later) For REST API, we should implement a loading state and error state
    await comments.createThread({
      initialComment: {
        body: newCommentEditor.document,
      },
    });
    comments.stopPendingComment();
    editor.transact((tr) => {
      tr.setSelection(TextSelection.create(tr.doc, tr.selection.to));
    });
    editor.focus();
  }, [comments, newCommentEditor, editor]);

  return (
    <Components.Comments.Card className={"bn-thread"}>
      <CommentEditor
        autoFocus={true}
        editable={true}
        editor={newCommentEditor}
        actions={({ isFocused, isEmpty }) => (
          <FloatingComposerActionsComponent
            isFocused={isFocused}
            isEmpty={isEmpty}
            onSave={onSave}
            Components={Components}
            dict={dict}
          />
        )}
      />
    </Components.Comments.Card>
  );
}
