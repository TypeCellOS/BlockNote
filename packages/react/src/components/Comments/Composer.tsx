import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useCreateBlockNote } from "../../hooks/useCreateBlockNote.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { schema } from "./schema.js";
export const Composer = () => {
  const dict = useDictionary();
  const editor = useBlockNoteEditor();

  const commentEditor = useCreateBlockNote({
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

  const components = useComponentsContext()!;

  return (
    <components.Comments.Composer
      className="bn-comment-composer"
      editor={commentEditor}
      onSubmit={() => {
        editor.comments!.createThread({
          initialComment: {
            body: commentEditor.document,
          },
        });
      }}
    />
  );
};
