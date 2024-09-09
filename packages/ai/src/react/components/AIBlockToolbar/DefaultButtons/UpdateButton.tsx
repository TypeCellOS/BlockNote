import {
  BlockSchemaWithBlock,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useComponentsContext } from "@blocknote/react";

import { aiBlockConfig } from "../../../../core/blocks/AIBlockContent/AIBlockContent";
import { mockAIReplaceBlockContent } from "../../../../core/blocks/AIBlockContent/mockAIFunctions";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor";
import { useDictionary } from "../../../hooks/useDictionary";
import { AIBlockToolbarProps } from "../AIBlockToolbarProps";

export const UpdateButton = (
  props: AIBlockToolbarProps & {
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
