import { Loader, Menu } from "@mantine/core";
import { Children, useMemo } from "react";

import { DefaultReactSuggestionItem, SuggestionMenuProps } from "../types";
import { SuggestionMenuItem } from "./SuggestionMenuItem";

export function SuggestionMenu<T extends DefaultReactSuggestionItem>(
  props: SuggestionMenuProps<T>
) {
  const { items, loadingState, selectedIndex, onItemClick } = props;

  const loader =
    loadingState === "loading-initial" || loadingState === "loading" ? (
      <Loader className={"bn-slash-menu-loader"} type="dots" />
    ) : null;

  const renderedItems = useMemo<JSX.Element[]>(() => {
    let currentGroup: string | undefined = undefined;
    const renderedItems = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.group !== currentGroup) {
        currentGroup = item.group;
        renderedItems.push(
          <Menu.Label key={currentGroup}>{currentGroup}</Menu.Label>
        );
      }

      renderedItems.push(
        <SuggestionMenuItem
          {...item}
          isSelected={i === selectedIndex}
          key={item.title}
          onClick={() => onItemClick?.(item)}
        />
      );
    }

    return renderedItems;
  }, [items, selectedIndex, onItemClick]);

  return (
    <Menu
      withinPortal={false}
      trapFocus={false}
      /** Hacky fix to get the desired menu behaviour. The trigger="hover"
       * attribute allows focus to remain on the editor, allowing for suggestion
       * filtering. The closeDelay=10000000 attribute allows the menu to stay open
       * practically indefinitely, as normally hovering off it would cause it to
       * close due to trigger="hover".
       */
      defaultOpened={true}
      trigger={"hover"}
      closeDelay={10000000}>
      <Menu.Dropdown
        onMouseDown={(event) => event.preventDefault()}
        className={"bn-slash-menu"}>
        {renderedItems}
        {Children.count(renderedItems) === 0 &&
          (props.loadingState === "loading" ||
            props.loadingState === "loaded") && (
            <Menu.Item>No match found</Menu.Item>
          )}
        {loader}
      </Menu.Dropdown>
    </Menu>
  );
}
