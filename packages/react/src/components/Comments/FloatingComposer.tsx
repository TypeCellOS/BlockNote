import { mergeCSSClasses } from "@blocknote/core";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useCreateBlockNote } from "../../hooks/useCreateBlockNote.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { CommentEditor } from "./CommentEditor.js";
import { defaultCommentEditorSchema } from "./defaultCommentEditorSchema.js";

/**
 * The FloatingComposer component displays a comment editor "floating" card.
 *
 * It's used when the user highlights a parts of the document to create a new comment / thread.
 */
export function FloatingComposer() {
  const editor = useBlockNoteEditor();

  if (!editor.comments) {
    throw new Error("Comments plugin not found");
  }

  const comments = editor.comments;

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
    schema: editor.comments.commentEditorSchema || defaultCommentEditorSchema,
  });

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
              mainTooltip="Save"
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
              }}
            >
              Save
            </Components.Generic.Toolbar.Button>
          </Components.Generic.Toolbar.Root>
        )}
      />
    </Components.Comments.Card>
  );
}
