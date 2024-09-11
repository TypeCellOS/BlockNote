import {
  BlockSchema,
  filterSuggestionItems,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import {
  DefaultReactSuggestionItem,
  useComponentsContext,
  useSuggestionMenuKeyboardHandler,
} from "@blocknote/react";
import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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

  const items: DefaultReactSuggestionItem[] = useMemo(
    () =>
      filterSuggestionItems(
        [
          {
            name: "make-longer",
            title: "Make Longer",
            onItemClick: () => runAIEdit("Make longer"),
          },
          {
            name: "make-shorter",
            title: "Make Shorter",
            onItemClick: () => runAIEdit("Make shorter"),
          },
          {
            name: "summarize",
            title: "Summarize",
            onItemClick: () => runAIEdit("Summarize"),
          },
        ],
        currentEditingPrompt
      ),
    [currentEditingPrompt, runAIEdit]
  );

  const { selectedIndex, setSelectedIndex, handler } =
    useSuggestionMenuKeyboardHandler(items, (item) => item.onItemClick());

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        if (items.length > 0) {
          handler(event);
        } else {
          handleEnter(event);
        }
      } else {
        handler(event);
      }
    },
    [handleEnter, handler, items.length]
  );

  // Resets index when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [currentEditingPrompt, setSelectedIndex]);

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
        <Components.Generic.Form.Root>
          <Components.Generic.Form.TextInput
            name={"ai-prompt"}
            icon={<RiSparkling2Fill />}
            value={currentEditingPrompt || ""}
            autoFocus={true}
            placeholder={dict.formatting_toolbar.ai.input_placeholder}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
          />
        </Components.Generic.Form.Root>
        <Components.SuggestionMenu.Root
          className={"bn-ai-menu"}
          id={"ai-suggestion-menu"}>
          {items.map((item, index) => (
            <Components.SuggestionMenu.Item
              key={item.name}
              className={"bn-suggestion-menu-item"}
              id={item.name}
              isSelected={index === selectedIndex}
              onClick={item.onItemClick}
              item={item}
            />
          ))}
        </Components.SuggestionMenu.Root>
      </Components.Generic.Popover.Content>
    </Components.Generic.Popover.Root>
  );
};
