import { useComponentsContext } from "@blocknote/react";
import { RiLoopLeftFill } from "react-icons/ri";

import { mockAIReplaceSelection } from "../../../../core/blocks/AIBlockContent/mockAIFunctions";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor";
import { useDictionary } from "../../../hooks/useDictionary";
import { AIInlineToolbarProps } from "../AIInlineToolbarProps";

export const RetryButton = (
  props: AIInlineToolbarProps & {
    updating: boolean;
    setUpdating: (updating: boolean) => void;
  }
) => {
  const dict = useDictionary();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<any, any, any>();

  if (!editor.isEditable) {
    return null;
  }

  return (
    <Components.Toolbar.Button
      className={"bn-button"}
      icon={!props.updating && <RiLoopLeftFill />}
      mainTooltip={dict.ai_inline_toolbar.retry}
      label={dict.ai_inline_toolbar.retry}
      onClick={async () => {
        props.setUpdating(true);
        // editor.focus();
        await mockAIReplaceSelection(editor, props.prompt);
        props.setUpdating(false);
      }}>
      {props.updating && dict.ai_inline_toolbar.updating}
    </Components.Toolbar.Button>
  );
};
