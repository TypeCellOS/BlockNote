import {
  aiBlockConfig,
  BlockSchemaWithBlock,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { TextSelection } from "prosemirror-state";
import { RiArrowGoBackFill } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor";
import { useDictionary } from "../../../i18n/dictionary";
import { AIInlineToolbarProps } from "../AIInlineToolbarProps";

export const RevertButton = (props: AIInlineToolbarProps) => {
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
      icon={<RiArrowGoBackFill />}
      mainTooltip={dict.ai_inline_toolbar.revert}
      label={dict.ai_inline_toolbar.revert}
      onClick={() => {
        editor.focus();
        const oldDocSize = editor._tiptapEditor.state.doc.nodeSize;
        const startPos = editor._tiptapEditor.state.selection.from;
        const endPos = editor._tiptapEditor.state.selection.to;
        const replacedContent = editor.getSelection()?.blocks || [
          editor.getTextCursorPosition().block,
        ];

        editor.replaceBlocks(replacedContent, props.originalContent as any[]);

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

        editor.formattingToolbar.closeMenu();
        editor.focus();
        editor.aiInlineToolbar.close();
      }}
    />
  );
};
