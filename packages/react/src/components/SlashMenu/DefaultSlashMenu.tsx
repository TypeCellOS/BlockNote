import { Menu } from "@mantine/core";
import foreach from "lodash.foreach";
import groupBy from "lodash.groupby";

import { BlockSchema } from "@blocknote/core";
import { SlashMenuItem } from "./SlashMenuItem";
import type { SlashMenuProps } from "./SlashMenuPositioner";
import { useEffect, useRef, useState } from "react";
import { ReactSlashMenuItem } from "../../slashMenuItems/ReactSlashMenuItem";

export function DefaultSlashMenu<BSchema extends BlockSchema>(
  props: SlashMenuProps<BSchema>
) {
  const [orderedItems, setOrderedItems] = useState<
    ReactSlashMenuItem<BSchema>[] | undefined
  >(undefined);
  const [renderedItems, setRenderedItems] = useState<JSX.Element[] | undefined>(
    undefined
  );
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const notFoundCount = useRef(0);

  // Sets the items to render.
  useEffect(() => {
    props.items.then((items) => {
      const orderedItems: ReactSlashMenuItem<BSchema>[] = [];
      const renderedItems: JSX.Element[] = [];
      let itemIndex = 0;

      const groups = groupBy(items, (item) => item.group);

      foreach(groups, (groupedItems) => {
        renderedItems.push(
          <Menu.Label key={groupedItems[0].group}>
            {groupedItems[0].group}
          </Menu.Label>
        );

        for (const item of groupedItems) {
          orderedItems.push(item);
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
      });

      setOrderedItems(orderedItems);
      setRenderedItems(renderedItems);

      // Closes menu if query does not match any items after 3 tries.
      // TODO: Not quite the right behaviour - should actually close if 3
      //  characters are added to the first query that does not match any items.
      if (orderedItems.length === 0) {
        if (notFoundCount.current >= 3) {
          props.closeMenu();
        } else {
          notFoundCount.current++;
        }
      }
    });
  }, [props, selectedIndex]);

  // Handles keyboard navigation.
  useEffect(() => {
    const preventMenuNavigationKeys = (event: KeyboardEvent) => {
      console.log(event.key);
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
        {renderedItems ? (
          renderedItems.length > 0 ? (
            renderedItems
          ) : (
            <Menu.Item>No match found</Menu.Item>
          )
        ) : (
          <Menu.Item>Loading...</Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
