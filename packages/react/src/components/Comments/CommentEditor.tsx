import { BlockNoteEditor } from "@blocknote/core";
import { FC, useCallback, useState } from "react";
import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useEditorChange } from "../../hooks/useEditorChange.js";
import { schema } from "./schema.js";

function isDocumentEmpty(
  editor: BlockNoteEditor<
    typeof schema.blockSchema,
    typeof schema.inlineContentSchema,
    typeof schema.styleSchema
  >
) {
  return (
    editor.document.length === 0 ||
    (editor.document.length === 1 &&
      editor.document[0].type === "paragraph" &&
      editor.document[0].content.length === 0)
  );
}

export const CommentEditor = (props: {
  editable: boolean;
  placeholder?: string;
  actions?: FC<{
    isFocused: boolean;
    isEmpty: boolean;
  }>;
  editor: BlockNoteEditor<
    typeof schema.blockSchema,
    typeof schema.inlineContentSchema,
    typeof schema.styleSchema
  >;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isEmpty, setIsEmpty] = useState(isDocumentEmpty(props.editor));

  const components = useComponentsContext()!;

  useEditorChange(() => {
    setIsEmpty(isDocumentEmpty(props.editor));
  }, props.editor);

  const onFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const onBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  return (
    <>
      <components.Comments.Editor
        className="bn-comment-editor"
        editor={props.editor}
        onFocus={onFocus}
        onBlur={onBlur}
        editable={props.editable}
      />
      {props.actions && (
        <div style={{ width: "100%" }}>
          <props.actions isFocused={isFocused} isEmpty={isEmpty} />
        </div>
      )}
    </>
  );
};
