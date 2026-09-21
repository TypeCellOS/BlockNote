import { BlockNoteEditor } from "@blocknote/core";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useEditorDOMElement } from "../../hooks/useEditorDomElement.js";
import { useEditorState } from "../../hooks/useEditorState.js";

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
  actions?: (args: { isFocused: boolean; isEmpty: boolean }) => ReactNode;
  editor: BlockNoteEditor<any, any, any>;
  onSubmit?: () => void | Promise<void>;
}) => {
  const { editor, editable, onSubmit } = props;
  const editorElement = useEditorDOMElement(editor);
  const [isFocused, setIsFocused] = useState(false);
  const isEmpty = useEditorState({
    editor: props.editor,
    selector: ({ editor }) => editor.isEmpty,
  });

  const components = useComponentsContext()!;

  useEffect(() => {
    if (!editorElement || !editable || !onSubmit) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (
        event.key !== "Enter" ||
        event.shiftKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.isComposing
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (!editor.isEmpty && !event.repeat) {
        onSubmit?.();
      }
    }

    editorElement.addEventListener("keydown", onKeyDown, true);
    return () => {
      editorElement.removeEventListener("keydown", onKeyDown, true);
    };
  }, [editorElement, editor, editable, onSubmit]);

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
          {props.actions({ isFocused, isEmpty })}
        </div>
      )}
    </>
  );
};
