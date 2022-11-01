import SuggestionItem from "../SuggestionItem";
import { useEffect, useRef } from "react";
import { Menu } from "@mantine/core";
import styles from "./SuggestionGroup.module.css";
import { SuggestionGroupItemContent } from "./SuggestionGroupItemContent";

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

  function isSelected() {
    const isKeyboardSelected =
      props.selectedIndex !== undefined && props.selectedIndex === props.index;
    const isMouseSelected = itemRef.current?.matches(":hover");

    return isKeyboardSelected || isMouseSelected;
  }

  function updateSelection() {
    isSelected()
      ? itemRef.current?.setAttribute("data-hovered", "true")
      : itemRef.current?.removeAttribute("data-hovered");
  }

  useEffect(() => {
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
      icon={
        Icon && (
          <div className={styles.iconWrapper}>
            <Icon className={styles.icon} />
          </div>
        )
      }
      onClick={() => {
        setTimeout(() => {
          props.clickItem(props.item);
        }, 0);
      }}
      onMouseLeave={() => {
        setTimeout(() => {
          isSelected()
            ? itemRef.current?.setAttribute("data-hovered", "true")
            : itemRef.current?.removeAttribute("data-hovered");
        });
      }}
      ref={itemRef}>
      <SuggestionGroupItemContent item={props.item} />
    </Menu.Item>
  );
}
