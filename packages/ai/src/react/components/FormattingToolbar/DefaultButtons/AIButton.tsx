import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { useComponentsContext } from "@blocknote/react";
import { RiSparkling2Fill } from "react-icons/ri";

import { useBlockNoteEditor } from "@blocknote/react";
import { useAIDictionary } from "../../../hooks/useAIDictionary";
import { AIMenu } from "../../AIMenu/AIMenu";

// TODO: name?
export const AIButton = () => {
  const dict = useAIDictionary();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  if (!editor.isEditable) {
    return null;
  }

  return (
    <Components.Generic.Popover.Root>
      <Components.Generic.Popover.Trigger>
        <Components.Toolbar.Button
          className={"bn-button"}
          label={dict.formatting_toolbar.ai.tooltip}
          mainTooltip={dict.formatting_toolbar.ai.tooltip}
          icon={<RiSparkling2Fill />}
        />
      </Components.Generic.Popover.Trigger>
      <Components.Generic.Popover.Content
        variant="form-popover"
        className={"bn-popover-content bn-form-popover"}>
        <AIMenu />
      </Components.Generic.Popover.Content>
    </Components.Generic.Popover.Root>
  );
};
