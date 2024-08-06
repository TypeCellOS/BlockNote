import {
  BlockSchema,
  InlineContentSchema,
  mockAIOperation,
  StyleSchema,
} from "@blocknote/core";
import { TextSelection } from "@tiptap/pm/state";
import { ChangeEvent, KeyboardEvent, useCallback, useState } from "react";
import { RiSparkling2Fill } from "react-icons/ri";

import { useDictionary } from "../../../i18n/dictionary";
import { useComponentsContext } from "../../../editor/ComponentsContext";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor";

export const AIButton = () => {
  const dict = useDictionary();
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const [currentEditingPrompt, setCurrentEditingPrompt] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  const runAIEdit = useCallback(
    async (prompt: string) => {
      setUpdating(true);

      const oldDocSize = editor._tiptapEditor.state.doc.nodeSize;
      const startPos = editor._tiptapEditor.state.selection.from;
      const endPos = editor._tiptapEditor.state.selection.to;
      const originalContent = editor.getSelection()?.blocks || [
        editor.getTextCursorPosition().block,
      ];

      editor.replaceBlocks(
        originalContent,
        (await mockAIOperation(editor, prompt, {
          operation: "replaceSelection",
        })) as any[]
      );

      const newDocSize = editor._tiptapEditor.state.doc.nodeSize;

      editor._tiptapEditor.view.dispatch(
        editor._tiptapEditor.state.tr.setSelection(
          TextSelection.create(
            editor._tiptapEditor.state.doc,
            startPos,
            endPos + newDocSize - oldDocSize
          )
        )
      );

      setUpdating(false);
      editor.formattingToolbar.closeMenu();
      editor.focus();
      editor.aiInlineToolbar.open(prompt, originalContent);
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
        <Components.FormattingToolbar.Button
          className={"bn-button"}
          label={dict.formatting_toolbar.ai.tooltip}
          mainTooltip={dict.formatting_toolbar.ai.tooltip}
          icon={!updating && <RiSparkling2Fill />}>
          {updating && "Updating..."}
        </Components.FormattingToolbar.Button>
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
