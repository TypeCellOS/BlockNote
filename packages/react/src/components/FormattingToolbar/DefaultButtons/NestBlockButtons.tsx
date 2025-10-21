import {
  BlockSchema,
  formatKeyboardShortcut,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useCallback } from "react";
import { RiIndentDecrease, RiIndentIncrease } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useEditorState } from "../../../hooks/useEditorState.js";
import { useDictionary } from "../../../i18n/dictionary.js";

export const NestBlockButton = () => {
  const dict = useDictionary();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const { show, canNestBlock } = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor.isEditable) {
        return { show: false, canNestBlock: false };
      }
      const selectedBlocks = editor.getSelection()?.blocks || [
        editor.getTextCursorPosition().block,
      ];
      return {
        show: !selectedBlocks.find(
          (block) => editor.schema.blockSchema[block.type].content !== "inline",
        ),
        canNestBlock: editor.canNestBlock(),
      };
    },
  });

  const nestBlock = useCallback(() => {
    editor.focus();
    editor.nestBlock();
  }, [editor]);

  if (!show) {
    return null;
  }

  return (
    <Components.FormattingToolbar.Button
      className={"bn-button"}
      data-test="nestBlock"
      onClick={nestBlock}
      isDisabled={!canNestBlock}
      label={dict.formatting_toolbar.nest.tooltip}
      mainTooltip={dict.formatting_toolbar.nest.tooltip}
      secondaryTooltip={formatKeyboardShortcut(
        dict.formatting_toolbar.nest.secondary_tooltip,
        dict.generic.ctrl_shortcut,
      )}
      icon={<RiIndentIncrease />}
    />
  );
};

export const UnnestBlockButton = () => {
  const dict = useDictionary();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<any, any, any>();

  const { show, canUnnestBlock } = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor.isEditable) {
        return { show: false, canUnnestBlock: false };
      }
      const selectedBlocks = editor.getSelection()?.blocks || [
        editor.getTextCursorPosition().block,
      ];
      return {
        show: !selectedBlocks.find(
          (block) => editor.schema.blockSchema[block.type].content !== "inline",
        ),
        canUnnestBlock: editor.canUnnestBlock(),
      };
    },
  });

  const unnestBlock = useCallback(() => {
    editor.focus();
    editor.unnestBlock();
  }, [editor]);

  if (!show) {
    return null;
  }

  return (
    <Components.FormattingToolbar.Button
      className={"bn-button"}
      data-test="unnestBlock"
      onClick={unnestBlock}
      isDisabled={!canUnnestBlock}
      label={dict.formatting_toolbar.unnest.tooltip}
      mainTooltip={dict.formatting_toolbar.unnest.tooltip}
      secondaryTooltip={formatKeyboardShortcut(
        dict.formatting_toolbar.unnest.secondary_tooltip,
        dict.generic.ctrl_shortcut,
      )}
      icon={<RiIndentDecrease />}
    />
  );
};
