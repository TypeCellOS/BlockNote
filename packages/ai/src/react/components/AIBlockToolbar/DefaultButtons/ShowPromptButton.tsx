import {
  BlockSchemaWithBlock,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useComponentsContext } from "@blocknote/react";
import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { RiSparkling2Fill } from "react-icons/ri";

import { aiBlockConfig } from "../../../../core/blocks/AIBlockContent/AIBlockContent";
import { mockAIReplaceBlockContent } from "../../../../core/blocks/AIBlockContent/mockAIFunctions";
import { useAIDictionary } from "../../../hooks/useAIDictionary";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor";
import { AIBlockToolbarProps } from "../AIBlockToolbarProps";

export const ShowPromptButton = (
  props: AIBlockToolbarProps & {
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
        await mockAIReplaceBlockContent(
          editor,
          currentEditingPrompt,
          editor.getTextCursorPosition().block
        );
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
        <Components.Toolbar.Button
          className={"bn-button bn-show-prompt-button"}
          mainTooltip={`${
            dict.ai_block_toolbar.show_prompt_datetime_tooltip
          } ${new Date(
            editor.getTextCursorPosition().block.props.timeGenerated
          ).toLocaleString(undefined, {
            month: "numeric",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
          })}`}
          icon={<RiSparkling2Fill />}
          label={dict.ai_block_toolbar.show_prompt}
          onClick={handleClick}>
          {dict.ai_block_toolbar.show_prompt}
        </Components.Toolbar.Button>
      </Components.Generic.Popover.Trigger>
      <Components.Generic.Popover.Content
        className={"bn-popover-content bn-form-popover"}
        variant={"form-popover"}>
        <Components.Generic.Form.Root>
          <Components.Generic.Form.TextInput
            name={"generated-by-ai"}
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
