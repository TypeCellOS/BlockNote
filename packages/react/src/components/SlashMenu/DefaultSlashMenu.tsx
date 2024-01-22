import { Loader, Menu } from "@mantine/core";
import foreach from "lodash.foreach";
import groupBy from "lodash.groupby";

import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SuggestionMenuProps } from "../../components-shared/SuggestionMenu/SuggestionMenuPositioner";
import { ReactSlashMenuItem } from "../../slashMenuItems/ReactSlashMenuItem";
import { SlashMenuItem } from "./SlashMenuItem";

export function DefaultSlashMenu<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(props: SuggestionMenuProps<BSchema, I, S>) {
  const { query, getItems, closeMenu, clearQuery, editor } = props;

  const [orderedItems, setOrderedItems] = useState<
    ReactSlashMenuItem<BSchema, I, S>[] | undefined
  >(undefined);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Used to ignore the previous query if a new one is made before it returns.
  const currentQuery = useRef<string | undefined>();

  // Used to close the menu if the query is >3 characters longer than the last
  // query that returned any results.
  const lastUsefulQueryLength = useRef(0);

  const executeItem = useCallback(
    (item: ReactSlashMenuItem<BSchema, I, S>) => {
      closeMenu();
      clearQuery();
      item.execute(editor);
    },
    [clearQuery, closeMenu, editor]
  );

  // Gets the items to display and orders them by group.
  useEffect(() => {
    const thisQuery = query;
    currentQuery.current = query;

    setLoading(true);

    getItems(query).then((items) => {
      if (currentQuery.current !== thisQuery) {
        // outdated query returned, ignore the result
        return;
      }

      const orderedItems: ReactSlashMenuItem<BSchema, I, S>[] = [];

      const groups = groupBy(items, (item) => item.group);

      foreach(groups, (groupedItems) => {
        for (const item of groupedItems) {
          orderedItems.push(item);
        }
      });

      if (orderedItems.length > 0) {
        lastUsefulQueryLength.current = query.length;
      } else if (query.length - lastUsefulQueryLength.current > 3) {
        closeMenu();
      }

      setOrderedItems(orderedItems);
      setLoading(false);
    });
  }, [closeMenu, getItems, props, query]);

  // Creates the JSX elements to render.
  // TODO: extract
  const renderedItems = useMemo(() => {
    if (orderedItems === undefined) {
      return null;
    }

    if (orderedItems.length === 0) {
      return [];
    }

    const renderedItems: JSX.Element[] = [];
    let currentGroup = undefined;
    let itemIndex = 0;

    for (const item of orderedItems) {
      if (item.group !== currentGroup) {
        currentGroup = item.group;
        renderedItems.push(
          <Menu.Label key={currentGroup}>{currentGroup}</Menu.Label>
        );
      }

      renderedItems.push(
        <SlashMenuItem
          key={item.name}
          name={item.name}
          icon={item.icon}
          hint={item.hint}
          shortcut={item.shortcut}
          isSelected={selectedIndex === itemIndex}
          onClick={() => executeItem(item)}
        />
      );

      itemIndex++;
    }

    return renderedItems;
  }, [orderedItems, selectedIndex, executeItem]);

  // Handles keyboard navigation.
  useEffect(() => {
    const preventMenuNavigationKeys = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();

        if (orderedItems !== undefined) {
          setSelectedIndex(
            (selectedIndex - 1 + orderedItems!.length) % orderedItems!.length
          );
        }

        return true;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();

        if (orderedItems !== undefined) {
          setSelectedIndex((selectedIndex + 1) % orderedItems!.length);
        }

        return true;
      }

      if (event.key === "Enter") {
        event.preventDefault();

        if (orderedItems !== undefined) {
          executeItem(orderedItems[selectedIndex]);
        }

        return true;
      }

      if (event.key === "Escape") {
        event.preventDefault();

        closeMenu();

        return true;
      }

      return false;
    };

    editor.domElement.addEventListener(
      "keydown",
      preventMenuNavigationKeys,
      true
    );

    return () => {
      editor.domElement.removeEventListener(
        "keydown",
        preventMenuNavigationKeys,
        true
      );
    };
  }, [
    selectedIndex,
    orderedItems,
    editor.domElement,
    closeMenu,
    clearQuery,
    executeItem,
  ]);

  const loader = loading ? (
    <Loader className={"bn-slash-menu-loader"} type="dots" />
  ) : null;

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
        {renderedItems === null
          ? loader
          : renderedItems.length > 0
          ? [...renderedItems, loader]
          : [<Menu.Item>No match found</Menu.Item>, loader]}
      </Menu.Dropdown>
    </Menu>
  );
}
