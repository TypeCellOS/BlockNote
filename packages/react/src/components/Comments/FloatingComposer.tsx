import { mergeCSSClasses } from "@blocknote/core";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useCreateBlockNote } from "../../hooks/useCreateBlockNote.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { CommentEditor } from "./CommentEditor.js";
import { schema } from "./schema.js";

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

  // TODO: review use of sub-editor
  const newCommentEditor = useCreateBlockNote({
    trailingBlock: false,
    dictionary: {
      ...dict,
      placeholders: {
        ...dict.placeholders,
        default: "Write a comment...", // TODO: only for empty doc
      },
    },
    schema,
  });

  return (
    <Components.Comments.Card className={"bn-thread"}>
      <CommentEditor
        editable={true}
        editor={newCommentEditor}
        actions={({ isEmpty }) => (
          <Components.Generic.Toolbar.Root
            className={mergeCSSClasses(
              "bn-action-toolbar",
              "bn-comment-actions"
            )}
            variant="action-toolbar">
            <Components.Generic.Toolbar.Button
              className={"bn-button"}
              mainTooltip="Save"
              variant="compact"
              isDisabled={isEmpty}
              onClick={async () => {
                // TODO: handle errors?
                await comments.createThread({
                  initialComment: {
                    body: newCommentEditor.document,
                  },
                });
                comments.stopPendingComment();
              }}>
              Save
            </Components.Generic.Toolbar.Button>
          </Components.Generic.Toolbar.Root>
        )}
      />
    </Components.Comments.Card>
  );
}
