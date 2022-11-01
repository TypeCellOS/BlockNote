import { Menu } from "@mantine/core";
import SuggestionItem from "../SuggestionItem";
import { SuggestionGroupItem } from "./SuggestionGroupItem";

type SuggestionGroupProps<T> = {
  /**
   * Name of the group
   */
  name: string;

  /**
   * The list of items
   */
  items: T[];

  /**
   * Index of the selected item in this group; relative to this item group (so 0 refers to the first item in this group)
   * This should be 'undefined' if none of the items in this group are selected
   */
  selectedIndex?: number;

  /**
   * Callback that gets executed when an item is clicked on.
   */
  clickItem: (item: T) => void;
};

export function SuggestionGroup<T extends SuggestionItem>(
  props: SuggestionGroupProps<T>
) {
  return (
    <>
      <Menu.Label>{props.name}</Menu.Label>
      {props.items.map((item, index) => {
        return (
          <SuggestionGroupItem
            item={item}
            key={index} // TODO: using index as key is not ideal for performance, better have ids on suggestionItems
            index={index}
            selectedIndex={props.selectedIndex}
            clickItem={props.clickItem}
          />
        );
      })}
    </>
  );
}
