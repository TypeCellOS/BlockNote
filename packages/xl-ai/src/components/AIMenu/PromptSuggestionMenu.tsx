import { mergeCSSClasses } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import {
  DefaultReactSuggestionItem,
  useComponentsContext,
  useSuggestionMenuKeyboardHandler,
} from "@blocknote/react";
import {
  ChangeEvent,
  KeyboardEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type PromptSuggestionMenuProps = {
  items: DefaultReactSuggestionItem[];
  onManualPromptSubmit: (userPrompt: string) => void;
  promptText?: string;
  onPromptTextChange?: (userPrompt: string) => void;
  icon?: ReactNode;
  rightSection?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
};

export const PromptSuggestionMenu = (props: PromptSuggestionMenuProps) => {
  // const dict = useAIDictionary();
  const Components = useComponentsContext()!;

  const { onManualPromptSubmit, promptText, onPromptTextChange, disabled } =
    props;

  // Only used internal state when `props.prompText` is undefined (i.e., uncontrolled mode)
  const [internalPromptText, setInternalPromptText] = useState<string>("");
  const promptTextToUse = promptText || internalPromptText;

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
    [onPromptTextChange, setInternalPromptText, promptText],
  );

  const items: DefaultReactSuggestionItem[] = useMemo(() => {
    return filterSuggestionItems(props.items, promptTextToUse);
  }, [promptTextToUse, props.items]);

  const { selectedIndex, setSelectedIndex, handler } =
    useSuggestionMenuKeyboardHandler(items, (item) => item.onItemClick());

  const activeDescendantId =
    items.length > 0 && selectedIndex >= 0 && selectedIndex < items.length
      ? `bn-suggestion-menu-item-${selectedIndex}`
      : undefined;

  /**
   * What Enter does here depends on whether the menu is showing anything:
   * with suggestions it picks the highlighted one, and without it submits
   * whatever was typed as a prompt.
   *
   * Both cases are decided in {@link submit}, so that the form's `submit`
   * event - which is the only signal a mobile IME's action key produces -
   * makes the same choice a key press does.
   */
  const submit = useCallback(() => {
    if (items.length > 0) {
      items[selectedIndex]?.onItemClick();
    } else {
      onManualPromptSubmit(promptTextToUse);
    }
  }, [items, selectedIndex, onManualPromptSubmit, promptTextToUse]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // TODO: handle backspace to close
      if (
        event.key === "Enter" &&
        !event.nativeEvent.isComposing &&
        items.length === 0
      ) {
        // `handler` swallows Enter unconditionally, so with nothing to pick it
        // has to be left alone for the event to reach the form.
        return;
      }
      handler(event);
    },
    [handler, items.length],
  );

  // Resets index when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [promptTextToUse, setSelectedIndex]);

  const inputRef = useRef<HTMLInputElement>(null);
  const hasBeenDisabled = useRef(disabled);

  useEffect(() => {
    // This effect is used so that after the input has been disabled (for example, when AI results are loaded),
    // the input is focused again.
    if (inputRef.current && hasBeenDisabled.current && !disabled) {
      inputRef.current.focus();
    }

    if (disabled) {
      hasBeenDisabled.current = true;
    }
  }, [disabled]);

  return (
    <div className={"bn-combobox"}>
      <Components.Generic.Form.Root onSubmit={submit}>
        <Components.Generic.Form.TextInput
          ref={inputRef}
          className={"bn-combobox-input"}
          name={"ai-prompt"}
          variant={"large"}
          icon={props.icon}
          value={promptTextToUse || ""}
          placeholder={props.placeholder}
          disabled={props.disabled}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          autoComplete={"off"}
          rightSection={props.rightSection}
          aria-activedescendant={activeDescendantId}
        />
      </Components.Generic.Form.Root>
      {items.length > 0 && (
        <Components.SuggestionMenu.Root
          className={"bn-combobox-items"}
          id={"ai-suggestion-menu"}
        >
          {items.map((item, i) => (
            <Components.SuggestionMenu.Item
              key={item.title}
              className={mergeCSSClasses(
                "bn-suggestion-menu-item",
                item.size === "small" ? "bn-suggestion-menu-item-small" : "",
              )}
              id={`bn-suggestion-menu-item-${i}`}
              isSelected={i === selectedIndex}
              onClick={item.onItemClick}
              item={item}
            />
          ))}
        </Components.SuggestionMenu.Root>
      )}
    </div>
  );
};
