import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { FormattingToolbarExtension } from "@blocknote/core/extensions";
import {
  useBlockNoteEditor,
  useComponentsContext,
  useExtension,
} from "@blocknote/react";
import { RiSparkling2Fill } from "react-icons/ri";
import { AIExtension } from "../../AIExtension.js";
import { useAIDictionary } from "../../hooks/useAIDictionary.js";

export const AIToolbarButton = () => {
  const dict = useAIDictionary();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const ai = useExtension(AIExtension);
  const formattingToolbar = useExtension(FormattingToolbarExtension);

  const onClick = () => {
    const selection = editor.getSelection();
    if (!selection) {
      throw new Error("No selection");
    }

    const position = selection.blocks[selection.blocks.length - 1].id;

    ai.openAIMenuAtBlock(position);
    formattingToolbar.store.setState(false);
  };

  if (!editor.isEditable) {
    return null;
  }

  return (
    <Components.Generic.Toolbar.Button
      className={"bn-button"}
      label={dict.formatting_toolbar.ai.tooltip}
      mainTooltip={dict.formatting_toolbar.ai.tooltip}
      icon={<RiSparkling2Fill />}
      onClick={onClick}
    />
  );
};
