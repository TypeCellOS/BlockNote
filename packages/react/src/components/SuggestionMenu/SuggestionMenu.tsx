import { mergeCSSClasses } from "@blocknote/core";
import { JSX, useMemo } from "react";
import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { getSuggestionMenuItemKeys } from "./getSuggestionMenuItemKeys.js";
import { DefaultReactSuggestionItem, SuggestionMenuProps } from "./types.js";

export function SuggestionMenu<T extends DefaultReactSuggestionItem>(
  props: SuggestionMenuProps<T>,
) {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const { items, loadingState, selectedIndex, onItemClick } = props;

  const loader =
    loadingState === "loading-initial" || loadingState === "loading" ? (
      <Components.SuggestionMenu.Loader
        className={"bn-suggestion-menu-loader"}
      />
    ) : null;

  const renderedItems = useMemo<JSX.Element[]>(() => {
    let currentGroup: string | undefined = undefined;
    const renderedItems = [];
    const itemKeys = getSuggestionMenuItemKeys(items);
    // Group names don't have to be unique, so each label key also counts how
    // many earlier labels share the name.
    const seenGroups = new Map<string | undefined, number>();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.group !== currentGroup) {
        currentGroup = item.group;
        const groupCount = seenGroups.get(currentGroup) ?? 0;
        seenGroups.set(currentGroup, groupCount + 1);
        renderedItems.push(
          <Components.SuggestionMenu.Label
            className={"bn-suggestion-menu-label"}
            key={JSON.stringify(["label", groupCount, currentGroup ?? null])}
          >
            {currentGroup}
          </Components.SuggestionMenu.Label>,
        );
      }

      renderedItems.push(
        <Components.SuggestionMenu.Item
          className={mergeCSSClasses(
            "bn-suggestion-menu-item",
            item.size === "small" ? "bn-suggestion-menu-item-small" : "",
          )}
          item={item}
          id={`bn-suggestion-menu-item-${i}`}
          isSelected={i === selectedIndex}
          key={itemKeys[i]}
          onClick={() => onItemClick?.(item)}
        />,
      );
    }

    return renderedItems;
  }, [Components, items, onItemClick, selectedIndex]);

  return (
    <Components.SuggestionMenu.Root
      id="bn-suggestion-menu"
      className="bn-suggestion-menu"
    >
      {renderedItems}
      {renderedItems.length === 0 &&
        (props.loadingState === "loading" ||
          props.loadingState === "loaded") && (
          <Components.SuggestionMenu.EmptyItem
            className={"bn-suggestion-menu-item"}
          >
            {dict.suggestion_menu.no_items_title}
          </Components.SuggestionMenu.EmptyItem>
        )}
      {loader}
    </Components.SuggestionMenu.Root>
  );
}
