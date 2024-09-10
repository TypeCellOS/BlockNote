import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { useComponentsContext } from "@blocknote/react";
import { ChangeEvent, KeyboardEvent, useCallback, useState } from "react";
import { RiSparkling2Fill } from "react-icons/ri";

import { useBlockNoteEditor } from "@blocknote/react";
import { AIInlineToolbarProsemirrorPlugin } from "../../../../core";
import { useAIDictionary } from "../../../hooks/useAIDictionary";

// TODO: name?
export const AIButton = () => {
  const dict = useAIDictionary();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const [currentEditingPrompt, setCurrentEditingPrompt] = useState<string>("");

  const runAIEdit = useCallback(
    async (prompt: string) => {
      editor.formattingToolbar.closeMenu();
      (
        editor.extensions.aiInlineToolbar as AIInlineToolbarProsemirrorPlugin
      ).open(prompt, "replaceSelection");
    },
    [editor]
  );

  const handleEnter = useCallback(
    async (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        await runAIEdit(currentEditingPrompt);
      }
    },
    [currentEditingPrompt, runAIEdit]
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      setCurrentEditingPrompt(event.currentTarget.value),
    []
  );

  if (!editor.isEditable) {
    return null;
  }

  return (
    <Components.Generic.Menu.Root>
      <Components.Generic.Menu.Trigger>
        <Components.Toolbar.Button
          className={"bn-button"}
          label={dict.formatting_toolbar.ai.tooltip}
          mainTooltip={dict.formatting_toolbar.ai.tooltip}
          icon={<RiSparkling2Fill />}
        />
      </Components.Generic.Menu.Trigger>
      <Components.Generic.Menu.Dropdown
        className={"bn-popover-content bn-form-popover"}>
        <Components.Generic.Form.Root>
          <Components.Generic.Form.TextInput
            name={"ai-prompt"}
            icon={<RiSparkling2Fill />}
            value={currentEditingPrompt || ""}
            autoFocus={true}
            placeholder={dict.formatting_toolbar.ai.input_placeholder}
            onKeyDown={handleEnter}
            onChange={handleChange}
          />
        </Components.Generic.Form.Root>
        <Components.Generic.Menu.Item onClick={() => runAIEdit("Make longer")}>
          Make longer
        </Components.Generic.Menu.Item>
      </Components.Generic.Menu.Dropdown>
    </Components.Generic.Menu.Root>
  );
};
