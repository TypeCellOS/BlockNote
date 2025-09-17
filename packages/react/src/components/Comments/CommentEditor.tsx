import { BlockNoteEditor } from "@blocknote/core";
import { FC, useCallback, useEffect, useState } from "react";
import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useEditorChange } from "../../hooks/useEditorChange.js";

/**
 * The CommentEditor component displays an editor for creating or editing a comment.
 * Currently, we also use the non-editable version for displaying a comment.
 *
 * It's used:
 * - to create a new comment (FloatingComposer.tsx)
 * - As the last item in a Thread, to compose a reply (Thread.tsx)
 * - To edit or display an existing comment (Comment.tsx)
 *
 */
export const CommentEditor = (props: {
  autoFocus?: boolean;
  editable: boolean;
  actions?: FC<{
    isFocused: boolean;
    isEmpty: boolean;
  }>;
  editor: BlockNoteEditor<any, any, any>;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isEmpty, setIsEmpty] = useState(props.editor.isEmpty);

  const components = useComponentsContext()!;

  useEditorChange(() => {
    setIsEmpty(props.editor.isEmpty);
  }, props.editor);

  const onFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const onBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // When we click the edit button on a comment, we also want to focus the
  // comment editor
  useEffect(() => {
    if (props.editable && props.autoFocus) {
      props.editor.focus();
    }
  }, [props.autoFocus, props.editable, props.editor]);

  return (
    <>
      <components.Comments.Editor
        autoFocus={props.autoFocus}
        className="bn-comment-editor"
        editor={props.editor}
        onFocus={onFocus}
        onBlur={onBlur}
        editable={props.editable}
      />
      {props.actions && (
        <div className={"bn-comment-actions-wrapper"}>
          <props.actions isFocused={isFocused} isEmpty={isEmpty} />
        </div>
      )}
    </>
  );
};
