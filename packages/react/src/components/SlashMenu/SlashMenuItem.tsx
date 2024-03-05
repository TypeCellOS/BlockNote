import { Badge, Menu, Stack, Text } from "@mantine/core";
import { useEffect, useRef } from "react";

const MIN_LEFT_MARGIN = 5;

export type SlashMenuItemProps = {
  name: string;
  icon: JSX.Element;
  hint: string | undefined;
  shortcut?: string;
  isSelected: boolean;
  set: () => void;
};

export function SlashMenuItem(props: SlashMenuItemProps) {
  const itemRef = useRef<HTMLButtonElement>(null);

  function isSelected() {
    const isKeyboardSelected = props.isSelected;
    // props.selectedIndex !== undefined && props.selectedIndex === props.index;
    const isMouseSelected = itemRef.current?.matches(":hover");

    return isKeyboardSelected || isMouseSelected;
  }

  // Updates HTML "data-hovered" attribute which Mantine uses to set mouse hover styles.
  // Allows users to "hover" menu items when navigating using the keyboard.
  function updateSelection() {
    isSelected()
      ? itemRef.current?.setAttribute("data-hovered", "true")
      : itemRef.current?.removeAttribute("data-hovered");
  }

  useEffect(() => {
    // Updates whether the item is selected with the keyboard (triggered on selectedIndex prop change).
    updateSelection();

    if (
      isSelected() &&
      itemRef.current &&
      itemRef.current.getBoundingClientRect().left > MIN_LEFT_MARGIN //TODO: Kinda hacky, fix
      // This check is needed because initially the menu is initialized somewhere above outside the screen (with left = 1)
      // scrollIntoView() is called before the menu is set in the right place, and without the check would scroll to the top of the page every time
    ) {
      itemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  });

  return (
    <Menu.Item
      className={"bn-slash-menu-item"}
      onClick={props.set}
      closeMenuOnClick={false}
      // Ensures an item selected with both mouse & keyboard doesn't get deselected on mouse leave.
      onMouseLeave={() => {
        setTimeout(() => {
          updateSelection();
        }, 1);
      }}
      leftSection={props.icon}
      rightSection={
        props.shortcut && <Badge size={"xs"}>{props.shortcut}</Badge>
      }
      ref={itemRef}>
      <Stack>
        {/*Might need separate classes.*/}
        <Text lh={"20px"} size={"14px"} fw={500}>
          {props.name}
        </Text>
        <Text lh={"16px"} size={"10px"}>
          {props.hint}
        </Text>
      </Stack>
    </Menu.Item>
  );
}
