import { BlockNoteEditor, Dictionary, mergeCSSClasses } from "@blocknote/core";
import { CommentEditorSubmitExtension } from "@blocknote/core/comments";
import { memo } from "react";
import {
  Components,
  useComponentsContext,
} from "../../editor/ComponentsContext.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { CommentEditor } from "./CommentEditor.js";

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
export function FloatingComposer(props: {
  /**
   * The (empty) editor used to compose the new comment. Created and owned by
   * the `FloatingComposerController`, so it can check for unsaved text before
   * the composer is dismissed. Includes `CommentEditorSubmitExtension` with
   * the callback that creates the thread.
   */
  newCommentEditor: BlockNoteEditor<any, any, any>;
}) {
  const newCommentEditor = props.newCommentEditor;

  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const onSave = newCommentEditor.getExtension(
    CommentEditorSubmitExtension,
  )!.submit;

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
