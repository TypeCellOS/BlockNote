import {
  Combobox,
  Menu,
  Popover,
  useCombobox,
  useComboboxTargetProps,
} from "@mantine/core";
import foreach from "lodash.foreach";
import groupBy from "lodash.groupby";

import { BlockSchema } from "@blocknote/core";
import { useEffect, useRef, useState } from "react";
import { ReactSlashMenuItem } from "../../slashMenuItems/ReactSlashMenuItem";
import { SlashMenuItem } from "./SlashMenuItem";
import type { SlashMenuProps } from "./SlashMenuPositioner";

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
  // TODO: remove?
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
  // TODO: remove
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

    return () => {
      props.editor.domElement.removeEventListener(
        "keydown",
        preventMenuNavigationKeys,
        true
      );
    };
  }, [selectedIndex, orderedItems, props.editor.domElement, props]);

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    opened: true,
  });

  const options = renderedItems?.map((item, i) => (
    <Combobox.Option value={i + ""} key={i}>
      item {i}
    </Combobox.Option>
  ));

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(val) => {
        // setValue(val);
        combobox.closeDropdown();
      }}>
      <CustomComboboxTarget editor={props.editor} />
      <Combobox.Dropdown>
        <Combobox.Options>{options}</Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>

    // <Menu
    //   withinPortal={false}
    //   trapFocus={true}
    //   /** Hacky fix to get the desired menu behaviour. The trigger="hover"
    //    * attribute allows focus to remain on the editor, allowing for suggestion
    //    * filtering. The closeDelay=10000000 attribute allows the menu to stay open
    //    * practically indefinitely, as normally hovering off it would cause it to
    //    * close due to trigger="hover".
    //    */
    //   defaultOpened={true}
    //   trigger={"click"}
    //   closeDelay={10000000}>
    //   <Menu.Dropdown
    //     onMouseDown={(event) => event.preventDefault()}
    //     className={"bn-slash-menu"}>
    //     {renderedItems ? (
    //       renderedItems.length > 0 ? (
    //         renderedItems
    //       ) : (
    //         <Menu.Item>No match found</Menu.Item>
    //       )
    //     ) : (
    //       <Menu.Item>Loading...</Menu.Item>
    //     )}
    //   </Menu.Dropdown>
    // </Menu>
  );
}

// Our replacement for Mantines Combobox.Target
// We don't really have a Target element, as our editor functions as the target
function CustomComboboxTarget(props: { editor: any }) {
  const p = useComboboxTargetProps({
    onKeyDown: undefined,
    targetType: undefined,
    withKeyboardNavigation: true,
    withAriaAttributes: true,
    withExpandedAttribute: false,
  });

  useEffect(() => {
    const f = (event: KeyboardEvent) => {
      // create react synthetic event from event,
      // and pass the editor key event to the combobox keydown handler
      p.onKeyDown(createSyntheticEvent<any, any>(event) as any);
    };
    props.editor.domElement.addEventListener("keydown", f, true);

    return () => {
      props.editor.domElement.removeEventListener("keydown", f, true);
    };
  }, [props.editor.domElement]);
  return (
    <Popover.Target>
      <div />
    </Popover.Target>
  );
}

// helper to convert a native event to a react style event
export const createSyntheticEvent = <T extends Element, E extends Event>(
  event: E
): React.SyntheticEvent<T, E> => {
  let isDefaultPrevented = false;
  let isPropagationStopped = false;
  const preventDefault = () => {
    isDefaultPrevented = true;
    event.preventDefault();
  };
  const stopPropagation = () => {
    isPropagationStopped = true;
    event.stopPropagation();
  };
  return {
    nativeEvent: event,
    currentTarget: event.currentTarget as EventTarget & T,
    target: event.target as EventTarget & T,
    bubbles: event.bubbles,
    cancelable: event.cancelable,
    defaultPrevented: event.defaultPrevented,
    eventPhase: event.eventPhase,
    isTrusted: event.isTrusted,
    preventDefault,
    isDefaultPrevented: () => isDefaultPrevented,
    stopPropagation,
    isPropagationStopped: () => isPropagationStopped,
    persist: () => {},
    timeStamp: event.timeStamp,
    type: event.type,
  };
};
