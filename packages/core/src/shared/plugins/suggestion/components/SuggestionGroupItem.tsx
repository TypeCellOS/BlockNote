import SuggestionItem from "../SuggestionItem";
import { useEffect, useRef } from "react";
import { Badge, createStyles, Menu, Stack, Text } from "@mantine/core";

const MIN_LEFT_MARGIN = 5;

export type SuggestionGroupItemProps<T> = {
  item: T;
  index: number;
  selectedIndex?: number;
  clickItem: (item: T) => void;
};

export function SuggestionGroupItem<T extends SuggestionItem>(
  props: SuggestionGroupItemProps<T>
) {
  const itemRef = useRef<HTMLButtonElement>(null);
  const { classes } = createStyles({ root: {} })(undefined, {
    name: "SuggestionListItem",
  });

  function isSelected() {
    const isKeyboardSelected =
      props.selectedIndex !== undefined && props.selectedIndex === props.index;
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

  const Icon = props.item.icon;

  return (
    <Menu.Item
      className={classes.root}
      icon={Icon && <Icon size={18} />}
      onClick={() => props.clickItem(props.item)}
      // Ensures an item selected with both mouse & keyboard doesn't get deselected on mouse leave.
      onMouseLeave={() => {
        setTimeout(() => {
          updateSelection();
        });
      }}
      ref={itemRef}
      rightSection={
        props.item.shortcut && <Badge size={"xs"}>{props.item.shortcut}</Badge>
      }>
      <Stack>
        {/*Might need separate classes.*/}
        <Text size={14} weight={500}>
          {props.item.name}
        </Text>
        <Text size={10}>{props.item.hint}</Text>
      </Stack>
    </Menu.Item>
  );
}
