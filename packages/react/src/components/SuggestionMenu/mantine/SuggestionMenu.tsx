import { Children, useMemo } from "react";

import { useComponentsContext } from "../../../editor/ComponentsContext";
import { DefaultReactSuggestionItem, SuggestionMenuProps } from "../types";

// TODO: move directory up
export function SuggestionMenu<T extends DefaultReactSuggestionItem>(
  props: SuggestionMenuProps<T>
) {
  const components = useComponentsContext()!;
  const { items, loadingState, selectedIndex, onItemClick, setSelectedIndex } =
    props;

  const loader =
    loadingState === "loading-initial" || loadingState === "loading" ? (
      <components.SuggestionMenuLoader />
    ) : null;

  const renderedItems = useMemo<JSX.Element[]>(() => {
    let currentGroup: string | undefined = undefined;
    const renderedItems = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.group !== currentGroup) {
        currentGroup = item.group;
        renderedItems.push(
          <components.SuggestionMenuLabel key={currentGroup}>
            {currentGroup}
          </components.SuggestionMenuLabel>
        );
      }

      renderedItems.push(
        <components.SuggestionMenuItem
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
  }, [items, selectedIndex, components, onItemClick, setSelectedIndex]);

  return (
    <div
      // onMouseDown={(event: any) => event.preventDefault()} // TODO: needed?
      className={"bn-slash-menu"}>
      {renderedItems}
      {Children.count(renderedItems) === 0 &&
        (props.loadingState === "loading" ||
          props.loadingState === "loaded") && (
          <components.SuggestionMenuEmptyItem>
            No match found
          </components.SuggestionMenuEmptyItem>
        )}
      {loader}
    </div>
  );
}
