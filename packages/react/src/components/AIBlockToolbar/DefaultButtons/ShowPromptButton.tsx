import {
  aiBlockConfig,
  BlockSchemaWithBlock,
  InlineContentSchema,
  mockAIOperation,
  StyleSchema,
} from "@blocknote/core";
import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { RiSparkling2Fill } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor";
import { useDictionary } from "../../../i18n/dictionary";
import { AIBlockToolbarProps } from "../AIBlockToolbarProps";

export const ShowPromptButton = (
  props: AIBlockToolbarProps & {
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

  const [opened, setOpened] = useState(false);
  const [currentEditingPrompt, setCurrentEditingPrompt] = useState<string>(
    props.prompt
  );

  const handleClick = useCallback(() => setOpened(!opened), [opened]);

  const handleEnter = useCallback(
    async (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        props.setUpdating(true);
        setOpened(false);
        editor.updateBlock(editor.getTextCursorPosition().block, {
          props: { prompt: currentEditingPrompt },
          content: (
            await mockAIOperation(editor, props.prompt, {
              operation: "replaceBlock",
              blockIdentifier: editor.getTextCursorPosition().block,
            })
          )[0].content as any,
        });
        props.setUpdating(false);
      }
    },
    [currentEditingPrompt, editor, props]
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      setCurrentEditingPrompt(event.currentTarget.value),
    []
  );

  useEffect(() => {
    const callback = () => setOpened(false);

    editor.domElement.addEventListener("mousedown", callback);

    return () => {
      editor.domElement.removeEventListener("mousedown", callback);
    };
  }, [editor.domElement]);

  if (!editor.isEditable) {
    return null;
  }

  return (
    <Components.Generic.Popover.Root opened={opened}>
      <Components.Generic.Popover.Trigger>
        <Components.FormattingToolbar.Button
          className={"bn-button"}
          label={dict.ai_block_toolbar.show_prompt}
          onClick={handleClick}>
          {dict.ai_block_toolbar.show_prompt}
        </Components.FormattingToolbar.Button>
      </Components.Generic.Popover.Trigger>
      <Components.Generic.Popover.Content
        className={"bn-popover-content bn-form-popover"}
        variant={"form-popover"}>
        <Components.Generic.Form.Root>
          <Components.Generic.Form.TextInput
            name={"file-name"}
            icon={<RiSparkling2Fill />}
            value={currentEditingPrompt || ""}
            autoFocus={true}
            placeholder={""}
            onKeyDown={handleEnter}
            onChange={handleChange}
          />
        </Components.Generic.Form.Root>
      </Components.Generic.Popover.Content>
    </Components.Generic.Popover.Root>
  );
};
