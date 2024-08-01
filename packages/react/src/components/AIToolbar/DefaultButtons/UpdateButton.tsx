import {
  aiBlockConfig,
  BlockSchemaWithBlock,
  InlineContentSchema,
  mockAIModelCall,
  StyleSchema,
} from "@blocknote/core";

import { useComponentsContext } from "../../../editor/ComponentsContext";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor";
import { useDictionary } from "../../../i18n/dictionary";
import { AIToolbarProps } from "../AIToolbarProps";

export const UpdateButton = (
  props: AIToolbarProps & {
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
    <Components.AIToolbar.Button
      className={"bn-button"}
      label={dict.ai_toolbar.update}
      onClick={async () => {
        props.setUpdating(true);
        editor.focus();
        editor.updateBlock(editor.getTextCursorPosition().block, {
          props: { prompt: props.prompt },
          content: await mockAIModelCall(props.prompt),
        });
        props.setUpdating(false);
      }}>
      {props.updating ? dict.ai_toolbar.updating : dict.ai_toolbar.update}
    </Components.AIToolbar.Button>
  );
};
