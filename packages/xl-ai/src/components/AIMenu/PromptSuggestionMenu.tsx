import { filterSuggestionItems, mergeCSSClasses } from "@blocknote/core";
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

// import { useAIDictionary } from "../../i18n/useAIDictionary";

export type PromptSuggestionMenuProps = {
  items: DefaultReactSuggestionItem[];
  onManualPromptSubmit: (prompt: string) => void;
  promptText?: string;
  onPromptTextChange?: (prompt: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export const PromptSuggestionMenu = (props: PromptSuggestionMenuProps) => {
  // const dict = useAIDictionary();
  const Components = useComponentsContext()!;

  const { onManualPromptSubmit, promptText, onPromptTextChange } = props;

  // Only used internal state when `props.prompText` is undefined (i.e., uncontrolled mode)
  const [internalPromptText, setInternalPromptText] = useState<string>("");
  const promptTextToUse = promptText || internalPromptText;

  const handleEnter = useCallback(
    async (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        // console.log("ENTER", currentEditingPrompt);
        onManualPromptSubmit(promptTextToUse);
      }
    },
    [promptTextToUse, onManualPromptSubmit]
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const newValue = event.currentTarget.value;
      if (onPromptTextChange) {
        onPromptTextChange(newValue);
      }

      // Only update internal state if it's uncontrolled
      if (promptText === undefined) {
        setInternalPromptText(newValue);
      }
    },
    [onPromptTextChange, setInternalPromptText, promptText]
  );

  const items: DefaultReactSuggestionItem[] = useMemo(
    () => filterSuggestionItems(props.items, promptTextToUse),
    [promptTextToUse, props.items]
  );

  const { selectedIndex, setSelectedIndex, handler } =
    useSuggestionMenuKeyboardHandler(items, (item) => item.onItemClick());

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
  }, [promptTextToUse, setSelectedIndex]);

  return (
    <div className={"bn-combobox"}>
      <Components.Generic.Form.Root>
        <Components.Generic.Form.TextInput
          className={"bn-combobox-input"}
          name={"ai-prompt"}
          variant={"large"}
          icon={<RiSparkling2Fill />}
          value={promptTextToUse || ""}
          autoFocus={true}
          placeholder={props.placeholder}
          disabled={props.disabled}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          autoComplete={"off"}
        />
      </Components.Generic.Form.Root>
      <Components.SuggestionMenu.Root
        className={"bn-combobox-items"}
        id={"ai-suggestion-menu"}>
        {items.map((item, index) => (
          <Components.SuggestionMenu.Item
            key={item.key}
            className={mergeCSSClasses(
              "bn-suggestion-menu-item",
              item.size === "small" ? "bn-suggestion-menu-item-small" : ""
            )}
            id={item.key}
            isSelected={index === selectedIndex}
            onClick={item.onItemClick}
            item={item}
          />
        ))}
      </Components.SuggestionMenu.Root>
    </div>
  );
};
