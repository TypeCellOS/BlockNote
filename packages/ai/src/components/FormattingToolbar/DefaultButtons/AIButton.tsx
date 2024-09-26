import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { useComponentsContext } from "@blocknote/react";
import { RiSparkling2Fill } from "react-icons/ri";

import { useBlockNoteEditor } from "@blocknote/react";

import { AIMenuProsemirrorPlugin } from "../../../extensions/AIMenu/AIMenuPlugin";
import { useAIDictionary } from "../../../i18n/useAIDictionary";

// TODO: name?
export const AIButton = () => {
  const dict = useAIDictionary();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const onClick = () => {
    editor.formattingToolbar.closeMenu();
    (editor.extensions.aiMenu as AIMenuProsemirrorPlugin).open();
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
