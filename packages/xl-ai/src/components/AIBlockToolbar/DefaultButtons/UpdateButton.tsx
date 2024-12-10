import {
  BlockSchemaWithBlock,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useComponentsContext } from "@blocknote/react";

import { useBlockNoteEditor } from "@blocknote/react";
import { aiBlockConfig } from "../../../blocks/AIBlockContent/AIBlockContent.js";
import { mockAIReplaceBlockContent } from "../../../blocks/AIBlockContent/mockAIFunctions.js";
import { useAIDictionary } from "../../../i18n/useAIDictionary.js";
import { AIBlockToolbarProps } from "../AIBlockToolbarProps.js";

export const UpdateButton = (
  props: AIBlockToolbarProps & {
    updating: boolean;
    setUpdating: (updating: boolean) => void;
  }
) => {
  const dict = useAIDictionary();
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
    <Components.Toolbar.Button
      className={"bn-button"}
      label={dict.ai_block_toolbar.update}
      onClick={async () => {
        props.setUpdating(true);
        editor.focus();
        await mockAIReplaceBlockContent(
          editor,
          props.prompt,
          editor.getTextCursorPosition().block
        );
        props.setUpdating(false);
      }}>
      {props.updating
        ? dict.ai_block_toolbar.updating
        : dict.ai_block_toolbar.update}
    </Components.Toolbar.Button>
  );
};
