import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useCreateBlockNote } from "../../hooks/useCreateBlockNote.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { CommentEditor } from "./CommentEditor.js";
import { schema } from "./schema.js";

export function Composer() {
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext()!;
  const dict = useDictionary();

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
    <Components.Comments.Card>
      <CommentEditor
        editable={true}
        editor={newCommentEditor}
        actions={({ isEmpty }) => (
          <Components.Generic.Toolbar.Root variant="action-toolbar">
            <Components.Generic.Toolbar.Button
              mainTooltip="Save"
              variant="compact"
              isDisabled={isEmpty}
              onClick={() => {
                editor.comments!.createThread({
                  initialComment: {
                    body: newCommentEditor.document,
                  },
                });
              }}>
              Save
            </Components.Generic.Toolbar.Button>
          </Components.Generic.Toolbar.Root>
        )}
      />
    </Components.Comments.Card>
  );
}
