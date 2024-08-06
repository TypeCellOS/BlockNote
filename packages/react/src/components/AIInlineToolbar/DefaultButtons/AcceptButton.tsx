import {
  aiBlockConfig,
  BlockSchemaWithBlock,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

import { useComponentsContext } from "../../../editor/ComponentsContext";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor";
import { useDictionary } from "../../../i18n/dictionary";
import { RiCheckFill } from "react-icons/ri";

export const AcceptButton = () => {
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
      icon={<RiCheckFill />}
      mainTooltip={dict.ai_inline_toolbar.accept}
      label={dict.ai_inline_toolbar.accept}
      onClick={async () => {
        editor.aiInlineToolbar.close();
      }}
    />
  );
};
