import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  mergeCSSClasses,
  StyleSchema,
} from "@blocknote/core";
import { CommentsExtension } from "@blocknote/core/comments";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useExtension } from "../../hooks/useExtension.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { CommentEditor } from "./CommentEditor.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { TextSelection } from "@tiptap/pm/state";

/**
 * The FloatingComposer component displays a comment editor "floating" card.
 *
 * It's used when the user highlights a parts of the document to create a new comment / thread.
 */
export function FloatingComposer<
  B extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(props: {
  /**
   * The (empty) editor used to compose the new comment. Created and owned by
   * the `FloatingComposerController`, so it can check for unsaved text before
   * the composer is dismissed.
   */
  newCommentEditor: BlockNoteEditor<any, any, any>;
}) {
  const editor = useBlockNoteEditor<B, I, S>();
  const newCommentEditor = props.newCommentEditor;

  const comments = useExtension(CommentsExtension);

  const Components = useComponentsContext()!;
  const dict = useDictionary();

  return (
    <Components.Comments.Card className={"bn-thread"}>
      <CommentEditor
        autoFocus={true}
        editable={true}
        editor={newCommentEditor}
        actions={({ isEmpty }) => (
          <Components.Generic.Toolbar.Root
            className={mergeCSSClasses(
              "bn-action-toolbar",
              "bn-comment-actions",
            )}
            variant="action-toolbar"
          >
            <Components.Generic.Toolbar.Button
              className={"bn-button"}
              mainTooltip={dict.comments.save_button_text}
              variant="compact"
              isDisabled={isEmpty}
              onClick={async () => {
                // (later) For REST API, we should implement a loading state and error state
                await comments.createThread({
                  initialComment: {
                    body: newCommentEditor.document,
                  },
                });
                comments.stopPendingComment();
                editor.transact((tr) => {
                  tr.setSelection(
                    TextSelection.create(tr.doc, tr.selection.to),
                  );
                });
                editor.focus();
              }}
            >
              {dict.comments.save_button_text}
            </Components.Generic.Toolbar.Button>
          </Components.Generic.Toolbar.Root>
        )}
      />
    </Components.Comments.Card>
  );
}
