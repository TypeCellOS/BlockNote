import { useMemo } from "react";

import { useComponentsContext } from "../../editor/ComponentsContext";
// import { useDictionary } from "../../i18n/dictionary";
import { DefaultReactGridSuggestionItem, SuggestionMenuProps } from "./types";

export default function GridSuggestionMenu<
  T extends DefaultReactGridSuggestionItem
>(props: SuggestionMenuProps<T>): JSX.Element {
  const Components = useComponentsContext()!;
  // const dict = useDictionary();

  const {
    items,
    // loadingState,
    selectedIndex,
    onItemClick,
  } = props;

  // const loader =
  //   loadingState === "loading-initial" || loadingState === "loading" ? (
  //     <Components.SuggestionMenu.Loader className={"bn-suggestion-menu-loader"}>
  //       {dict.suggestion_menu.loading}
  //     </Components.SuggestionMenu.Loader>
  //   ) : null;

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
        />
      );
    }

    return renderedItems;
  }, [Components, items, onItemClick, selectedIndex]);

  return (
    <Components.GridSuggestionMenu.Root
      id="bn-grid-suggestion-menu"
      className="bn-grid-suggestion-menu">
      {renderedItems}
      {/*{renderedItems.length === 0 &&*/}
      {/*  (props.loadingState === "loading" ||*/}
      {/*    props.loadingState === "loaded") && (*/}
      {/*    <Components.SuggestionMenu.EmptyItem*/}
      {/*      className={"bn-suggestion-menu-item"}>*/}
      {/*      {dict.suggestion_menu.no_items_title}*/}
      {/*    </Components.SuggestionMenu.EmptyItem>*/}
      {/*  )}*/}
      {/*{loader}*/}
    </Components.GridSuggestionMenu.Root>
  );
}
