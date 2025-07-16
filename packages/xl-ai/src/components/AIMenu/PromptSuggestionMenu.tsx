import { filterSuggestionItems, mergeCSSClasses } from "@blocknote/core";
import {
  ComponentProps,
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
  useState,
} from "react";

export type PromptSuggestionMenuProps = {
  items: DefaultReactSuggestionItem[];
  inputProps: Partial<
    Omit<
      ComponentProps["Generic"]["Form"]["TextInput"],
      "name" | "label" | "variant" | "autoFocus" | "autoComplete"
    >
  >;
  loader?: ReactNode;
  isLoading?: boolean;
  leftSection?: ReactNode;
  rightSection?: ReactNode;
};

export const PromptSuggestionMenu = (props: PromptSuggestionMenuProps) => {
  // const dict = useAIDictionary();
  const Components = useComponentsContext()!;

  const { value, onKeyDown, onChange, onSubmit, ...rest } = props.inputProps;

  // Only used internal state when `promptText` is undefined (i.e., uncontrolled mode)
  const [internalPromptText, setInternalPromptText] = useState<string>("");
  const promptTextToUse = value || internalPromptText;

  const handleEnter = useCallback(
    async (event: KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event);
      if (event.key === "Enter") {
        onSubmit?.();
      }
    },
    [onKeyDown, onSubmit],
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange?.(event);

      // Only update internal state if it's uncontrolled
      if (value === undefined) {
        setInternalPromptText(event.currentTarget.value);
      }
    },
    [onChange, value],
  );

  const items: DefaultReactSuggestionItem[] = useMemo(() => {
    return filterSuggestionItems(props.items, promptTextToUse);
  }, [promptTextToUse, props.items]);

  const { selectedIndex, setSelectedIndex, handler } =
    useSuggestionMenuKeyboardHandler(items, (item) => item.onItemClick());

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
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
    [handleEnter, handler, items.length],
  );

  // Resets index when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [promptTextToUse, setSelectedIndex]);

  return (
    <div className={"bn-combobox"}>
      <div className={"bn-combobox-input-wrapper"}>
        {props.leftSection && (
          <div className="bn-combobox-left-section">{props.leftSection}</div>
        )}
        {!props.isLoading || !props.loader ? (
          <div className="bn-combobox-input">
            <Components.Generic.Form.Root>
              <Components.Generic.Form.TextInput
                // Change the key when disabled change, so that autofocus is retriggered
                // key={"input-" + props.disabled}
                name={"ai-prompt"}
                variant={"large"}
                value={promptTextToUse || ""}
                autoFocus={true}
                onKeyDown={handleKeyDown}
                onChange={handleChange}
                autoComplete={"off"}
                {...rest}
              />
            </Components.Generic.Form.Root>
          </div>
        ) : (
          <div className="bn-combobox-loader">{props.loader}</div>
        )}
        {props.rightSection && (
          <div className="bn-combobox-right-section">{props.rightSection}</div>
        )}
      </div>
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
    </div>
  );
};
