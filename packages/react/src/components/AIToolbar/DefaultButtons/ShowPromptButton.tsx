import {
  aiBlockConfig,
  BlockSchemaWithBlock,
  InlineContentSchema,
  mockAIModelCall,
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
import { AIToolbarProps } from "../AIToolbarProps";

export const ShowPromptButton = (
  props: AIToolbarProps & {
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
          props: { prompt: props.prompt },
          content: await mockAIModelCall(props.prompt),
        });
        props.setUpdating(false);
      }
    },
    [editor, props]
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

  return (
    <Components.Generic.Popover.Root opened={opened}>
      <Components.Generic.Popover.Trigger>
        <Components.FormattingToolbar.Button
          className={"bn-button"}
          label={dict.ai_toolbar.show_prompt}
          onClick={handleClick}>
          {dict.ai_toolbar.show_prompt}
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
