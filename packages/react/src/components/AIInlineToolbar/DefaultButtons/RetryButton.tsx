import {
  aiBlockConfig,
  BlockSchemaWithBlock,
  InlineContentSchema,
  mockAIOperation,
  StyleSchema,
} from "@blocknote/core";
import { TextSelection } from "prosemirror-state";
import { RiLoopLeftFill } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor";
import { useDictionary } from "../../../i18n/dictionary";
import { AIInlineToolbarProps } from "../AIInlineToolbarProps";

export const RetryButton = (
  props: AIInlineToolbarProps & {
    updating: boolean;
    setUpdating: (updating: boolean) => void;
  }
) => {
  const dict = useDictionary();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    BlockSchemaWithBlock<"ai", typeof aiBlockConfig>,
    InlineContentSchema,
    StyleSchema
  >();

  if (!editor.isEditable) {
    return null;
  }

  return (
    <Components.AIInlineToolbar.Button
      className={"bn-button"}
      icon={!props.updating && <RiLoopLeftFill />}
      mainTooltip={dict.ai_inline_toolbar.retry}
      label={dict.ai_inline_toolbar.retry}
      onClick={async () => {
        editor.focus();

        props.setUpdating(true);

        const oldDocSize = editor._tiptapEditor.state.doc.nodeSize;
        const startPos = editor._tiptapEditor.state.selection.from;
        const endPos = editor._tiptapEditor.state.selection.to;
        const currentContent = editor.getSelection()?.blocks || [
          editor.getTextCursorPosition().block,
        ];

        editor.replaceBlocks(
          currentContent,
          (await mockAIOperation(editor, props.prompt, {
            operation: "replaceSelection",
          })) as any[]
        );

        const newDocSize = editor._tiptapEditor.state.doc.nodeSize;

        editor._tiptapEditor.view.dispatch(
          editor._tiptapEditor.state.tr.setSelection(
            TextSelection.create(
              editor._tiptapEditor.state.doc,
              startPos,
              endPos + newDocSize - oldDocSize
            )
          )
        );

        props.setUpdating(false);
        editor.formattingToolbar.closeMenu();
        editor.focus();
        editor.aiInlineToolbar.open(props.prompt, props.originalContent);
      }}>
      {props.updating && dict.ai_inline_toolbar.updating}
    </Components.AIInlineToolbar.Button>
  );
};
