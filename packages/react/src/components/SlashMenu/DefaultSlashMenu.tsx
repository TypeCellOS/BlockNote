import { Loader, Menu } from "@mantine/core";
import foreach from "lodash.foreach";
import groupBy from "lodash.groupby";

import { BlockSchema } from "@blocknote/core";
import { SlashMenuItem } from "./SlashMenuItem";
import type { SlashMenuProps } from "./SlashMenuPositioner";
import { useEffect, useMemo, useRef, useState } from "react";
import { ReactSlashMenuItem } from "../../slashMenuItems/ReactSlashMenuItem";

export function DefaultSlashMenu<BSchema extends BlockSchema>(
  props: SlashMenuProps<BSchema>
) {
  const [orderedItems, setOrderedItems] = useState<
    ReactSlashMenuItem<BSchema>[] | undefined
  >(undefined);
  const [loader, setLoader] = useState<JSX.Element | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Used to ignore the previous query if a new one is made before it returns.
  const currentQuery = useRef<string | undefined>(undefined);
  // Used to close the menu if the query is >3 characters longer than the last
  // query that returned any results.
  const lastUsefulQueryLength = useRef(0);

  // Gets the items to display and orders them by group.
  useEffect(() => {
    const thisQuery = props.query;
    currentQuery.current = props.query;

    setLoader(<Loader className={"bn-slash-menu-loader"} type="dots" />);

    props.getItems(props.query).then((items) => {
      if (currentQuery.current !== thisQuery) {
        return;
      }

      const orderedItems: ReactSlashMenuItem<BSchema>[] = [];

      const groups = groupBy(items, (item) => item.group);

      foreach(groups, (groupedItems) => {
        for (const item of groupedItems) {
          orderedItems.push(item);
        }
      });

      if (orderedItems.length > 0) {
        lastUsefulQueryLength.current = props.query.length;
      } else if (props.query.length - lastUsefulQueryLength.current > 3) {
        props.closeMenu();
      }

      setOrderedItems(orderedItems);
      setLoader(null);
    });
  }, [props]);

  // Creates the JSX elements to render.
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
          set={() => {
            props.closeMenu();
            props.clearQuery();
            props.executeItem(item);
          }}
        />
      );

      itemIndex++;
    }

    return renderedItems;
  }, [orderedItems, props, selectedIndex]);

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
          props.closeMenu();
          props.clearQuery();
          props.executeItem(orderedItems[selectedIndex]);
        }

        return true;
      }

      if (event.key === "Escape") {
        event.preventDefault();

        props.closeMenu();

        return true;
      }

      return false;
    };

    props.editor.domElement.addEventListener(
      "keydown",
      preventMenuNavigationKeys,
      true
    );

    return () => {
      props.editor.domElement.removeEventListener(
        "keydown",
        preventMenuNavigationKeys,
        true
      );
    };
  }, [selectedIndex, orderedItems, props.editor.domElement, props]);

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
