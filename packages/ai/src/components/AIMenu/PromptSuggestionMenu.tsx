import { filterSuggestionItems } from "@blocknote/core";
import {
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

import { useAIDictionary } from "../../i18n/useAIDictionary";
import { AIMenuSuggestionItem } from "./getDefaultAIMenuItems";

export type PromptSuggestionMenuProps = {
  items: AIMenuSuggestionItem[];
  onManualPromptSubmit: (prompt: string) => void;
};

export const PromptSuggestionMenu = (props: PromptSuggestionMenuProps) => {
  const dict = useAIDictionary();
  const Components = useComponentsContext()!;

  const { onManualPromptSubmit } = props;

  const [currentEditingPrompt, setCurrentEditingPrompt] = useState<string>("");

  const handleEnter = useCallback(
    async (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        onManualPromptSubmit(currentEditingPrompt);
      }
    },
    [currentEditingPrompt, onManualPromptSubmit]
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      setCurrentEditingPrompt(event.currentTarget.value),
    []
  );

  const items: AIMenuSuggestionItem[] = useMemo(
    () => filterSuggestionItems(props.items, currentEditingPrompt),
    [currentEditingPrompt, props.items]
  );

  const { selectedIndex, setSelectedIndex, handler } =
    useSuggestionMenuKeyboardHandler(items, (item) =>
      item.onItemClick(setCurrentEditingPrompt)
    );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // TODO: handle backspace to close
      if (event.key === "Enter") {
        if (items.length > 0) {
          handler(event);
        } else {
          // TODO: check focus?
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

  return (
    <div className={"bn-ai-menu"}>
      <Components.Generic.Form.Root>
        <Components.Generic.Form.TextInput
          className={"bn-ai-menu-input"}
          name={"ai-prompt"}
          icon={<RiSparkling2Fill />}
          value={currentEditingPrompt || ""}
          autoFocus={true}
          placeholder={dict.formatting_toolbar.ai.input_placeholder}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          autoComplete={"off"}
        />
      </Components.Generic.Form.Root>
      <Components.SuggestionMenu.Root
        className={"bn-ai-menu-items"}
        id={"ai-suggestion-menu"}>
        {items.map((item, index) => (
          <Components.SuggestionMenu.Item
            key={item.name}
            className={"bn-suggestion-menu-item"}
            id={item.name}
            isSelected={index === selectedIndex}
            onClick={() => item.onItemClick(setCurrentEditingPrompt)}
            item={item}
          />
        ))}
      </Components.SuggestionMenu.Root>
    </div>
  );
};
