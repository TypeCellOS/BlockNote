import { DefaultReactSuggestionItem, SuggestionMenuProps } from "./types";
import { useComponentsContext } from "../../editor/ComponentsContext";
import { useMemo } from "react";

export function SuggestionMenu<T extends DefaultReactSuggestionItem>(
  props: SuggestionMenuProps<T>
) {
  const Components = useComponentsContext()!;

  const { items, loadingState, selectedIndex, setSelectedIndex, onItemClick } =
    props;

  const loader =
    loadingState === "loading-initial" || loadingState === "loading" ? (
      <Components.SuggestionMenu.Loader
        className={"bn-suggestion-menu-loader"}
      /> // TODO: test loader
    ) : null;

  const renderedItems = useMemo<JSX.Element[]>(() => {
    let currentGroup: string | undefined = undefined;
    const renderedItems = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.group !== currentGroup) {
        currentGroup = item.group;
        renderedItems.push(
          <Components.SuggestionMenu.Label
            className={"bn-suggestion-menu-label"}
            key={currentGroup}>
            {currentGroup}
          </Components.SuggestionMenu.Label>
        );
      }

      renderedItems.push(
        <Components.SuggestionMenu.Item
          className={"bn-suggestion-menu-item"}
          {...item}
          isSelected={i === selectedIndex}
          key={item.title}
          onClick={() => onItemClick?.(item)}
          setSelected={(selected) => {
            setSelectedIndex(selected ? i : -1);
          }}
        />
      );
    }

    return renderedItems;
  }, [Components, items, onItemClick, selectedIndex, setSelectedIndex]);

  return (
    <Components.SuggestionMenu.Root
      className={"bn-suggestion-menu"}
      // onMouseDown={(event: any) => event.preventDefault()} // TODO: needed?
    >
      {renderedItems}
      {renderedItems.length === 0 &&
        (props.loadingState === "loading" ||
          props.loadingState === "loaded") && (
          <Components.SuggestionMenu.EmptyItem
            className={"bn-suggestion-menu-item"}
          />
        )}
      {loader}
    </Components.SuggestionMenu.Root>
  );
}
