import {
  aiBlockConfig,
  BlockSchemaWithBlock,
  InlineContentSchema,
  mockAIOperation,
  StyleSchema,
} from "@blocknote/core";

import { useComponentsContext } from "../../../editor/ComponentsContext";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor";
import { useDictionary } from "../../../i18n/dictionary";
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
    <Components.AIBlockToolbar.Button
      className={"bn-button"}
      label={dict.ai_block_toolbar.update}
      onClick={async () => {
        props.setUpdating(true);
        editor.focus();
        editor.updateBlock(editor.getTextCursorPosition().block, {
          props: { prompt: props.prompt },
          content: (
            await mockAIOperation(editor, props.prompt, {
              operation: "replaceBlock",
              blockIdentifier: editor.getTextCursorPosition().block,
            })
          )[0].content as any,
        });
        props.setUpdating(false);
      }}>
      {props.updating
        ? dict.ai_block_toolbar.updating
        : dict.ai_block_toolbar.update}
    </Components.AIBlockToolbar.Button>
  );
};
