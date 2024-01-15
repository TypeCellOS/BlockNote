import {
  Combobox,
  Popover,
  useCombobox,
  useComboboxTargetProps,
} from "@mantine/core";
import foreach from "lodash.foreach";
import groupBy from "lodash.groupby";

import { BlockSchema } from "@blocknote/core";
import { SyntheticEvent, useEffect, useRef, useState } from "react";
import { SlashMenuItem } from "./SlashMenuItem";
import type { SlashMenuProps } from "./SlashMenuPositioner";

export function DefaultSlashMenu<BSchema extends BlockSchema>(
  props: SlashMenuProps<BSchema> & { referencePos: DOMRect }
) {
  const [renderedItems, setRenderedItems] = useState<JSX.Element[] | undefined>(
    undefined
  );
  const itemCallbacks = useRef<Record<string, () => void>>({});
  const notFoundCount = useRef(0);

  // Sets the items to render.
  // TODO: remove?
  useEffect(() => {
    props.items.then((items) => {
      const renderedItems: JSX.Element[] = [];

      const groups = groupBy(items, (item) => item.group);

      foreach(groups, (groupedItems) => {
        renderedItems.push(
          <Combobox.Group label={groupedItems[0].group}>
            {groupedItems.map((item) => (
              <Combobox.Option value={item.name}>
                <SlashMenuItem
                  name={item.name}
                  icon={item.icon}
                  hint={item.hint}
                  shortcut={item.shortcut}
                />
              </Combobox.Option>
            ))}
          </Combobox.Group>
        );
        groupedItems.forEach((item) => {
          itemCallbacks.current[item.name] = () => {
            props.closeMenu();
            props.clearQuery();
            props.executeItem(item);
          };
        });
      });

      setRenderedItems(renderedItems);

      // Closes menu if query does not match any items after 3 tries.
      // TODO: Not quite the right behaviour - should actually close if 3
      //  characters are added to the first query that does not match any items.
      if (items.length === 0) {
        if (notFoundCount.current >= 3) {
          props.closeMenu();
        } else {
          notFoundCount.current++;
        }
      }
    });
  }, [props]);

  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    opened: true,
  });

  return (
    <Combobox
      middlewares={{
        flip: true,
        shift: false,
        inline: false,
        size: true,
      }}
      position={"bottom-start"}
      offset={0}
      width={"400px"}
      withinPortal={false}
      store={combobox}
      onOptionSubmit={(value) => {
        combobox.closeDropdown();
        itemCallbacks.current[value]();
      }}>
      <CustomComboboxTarget
        editor={props.editor}
        referenceRect={props.referencePos}
      />
      {/* TODO: Not quite working properly with flip/size middleware */}
      {/* i.e. when the menu needs to be flipped but not resized */}
      <Combobox.Dropdown className={"bn-slash-menu"}>
        <Combobox.Options
          style={{
            maxHeight: "100%",
            position: "relative",
            overflow: "scroll",
          }}>
          {renderedItems}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

// Our replacement for Mantines Combobox.Target
// We don't really have a Target element, as our editor functions as the target
function CustomComboboxTarget(props: { editor: any; referenceRect: DOMRect }) {
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
  }, [p, props.editor.domElement]);
  return (
    <Popover.Target>
      <div
        style={{
          position: "absolute",
          top: props.referenceRect.top,
          left: props.referenceRect.left,
          width: props.referenceRect.width,
          height: props.referenceRect.height,
        }}
      />
    </Popover.Target>
  );
}

// helper to convert a native event to a react style event
export const createSyntheticEvent = <T extends Element, E extends Event>(
  event: E
): SyntheticEvent<T, E> => {
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
    persist: () => {
      return;
    },
    timeStamp: event.timeStamp,
    type: event.type,
  };
};
