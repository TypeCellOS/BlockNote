import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { useComponentsContext } from "@blocknote/react";
import { RiSparkling2Fill } from "react-icons/ri";

import { useBlockNoteEditor } from "@blocknote/react";

import { useAIDictionary } from "../../i18n/useAIDictionary.js";
import { useBlockNoteAIContext } from "../BlockNoteAIContext.js";

export const AIToolbarButton = () => {
  const dict = useAIDictionary();
  const Components = useComponentsContext()!;
  const ctx = useBlockNoteAIContext();
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const onClick = () => {
    editor.formattingToolbar.closeMenu();
    const position = editor.getTextCursorPosition().block;
    ctx.setAiMenuBlockID(position.id);
  };

  if (!editor.isEditable) {
    return null;
  }

  return (
    <Components.Toolbar.Button
      className={"bn-button"}
      label={dict.formatting_toolbar.ai.tooltip}
      mainTooltip={dict.formatting_toolbar.ai.tooltip}
      icon={<RiSparkling2Fill />}
      onClick={onClick}
    />
  );
};
