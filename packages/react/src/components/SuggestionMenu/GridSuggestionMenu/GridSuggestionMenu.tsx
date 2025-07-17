import { JSX, useMemo } from "react";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useDictionary } from "../../../i18n/dictionary.js";
import {
  DefaultReactGridSuggestionItem,
  GridSuggestionMenuProps,
} from "./types.js";

export function GridSuggestionMenu<T extends DefaultReactGridSuggestionItem>(
  props: GridSuggestionMenuProps<T>,
) {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const { items, loadingState, selectedIndex, onItemClick, columns } = props;

  const loader =
    loadingState === "loading-initial" || loadingState === "loading" ? (
      <Components.GridSuggestionMenu.Loader
        className={"bn-grid-suggestion-menu-loader"}
        columns={columns}
      />
    ) : null;

  const renderedItems = useMemo<JSX.Element[]>(() => {
    // let currentGroup: string | undefined = undefined;
    const renderedItems = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      // if (item.group !== currentGroup) {
      //   currentGroup = item.group;
      //   renderedItems.push(
      //     <Components.SuggestionMenu.Label
      //       className={"bn-suggestion-menu-label"}
      //       key={currentGroup}>
      //       {currentGroup}
      //     </Components.SuggestionMenu.Label>
      //   );
      // }

      renderedItems.push(
        <Components.GridSuggestionMenu.Item
          className={"bn-grid-suggestion-menu-item"}
          item={item}
          id={`bn-grid-suggestion-menu-item-${i}`}
          isSelected={i === selectedIndex}
          key={item.id}
          onClick={() => onItemClick?.(item)}
        />,
      );
    }

    return renderedItems;
  }, [Components, items, onItemClick, selectedIndex]);

  return (
    <Components.GridSuggestionMenu.Root
      id="bn-grid-suggestion-menu"
      columns={columns}
      className="bn-grid-suggestion-menu"
    >
      {loader}
      {renderedItems}
      {renderedItems.length === 0 && props.loadingState === "loaded" && (
        <Components.GridSuggestionMenu.EmptyItem
          className={"bn-grid-suggestion-menu-empty-item"}
          columns={columns}
        >
          {dict.suggestion_menu.no_items_title}
        </Components.GridSuggestionMenu.EmptyItem>
      )}
    </Components.GridSuggestionMenu.Root>
  );
}
