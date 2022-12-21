import SuggestionItem from "@blocknote/core/types/src/shared/plugins/suggestion/SuggestionItem";
import { createStyles, Menu } from "@mantine/core";
import { SuggestionsMenuProps } from "../../../../../core/src/menu-tools/SuggestionsMenu/types";
import { SuggestionListItem } from "./SuggestionListItem";

export type SuggestionListProps<T extends SuggestionItem> =
  SuggestionsMenuProps<T>;

export function SuggestionList<T extends SuggestionItem>(
  props: SuggestionListProps<T>
) {
  const { classes } = createStyles({ root: {} })(undefined, {
    name: "SuggestionList",
  });
  console.log(props.menuItems.items);

  const headingGroup = [];
  const basicBlockGroup = [];

  for (const item of props.menuItems.items) {
    console.log(item.name);

    if (item.name === "Heading") {
      headingGroup.push(item);
    }

    if (item.name === "Heading 2") {
      headingGroup.push(item);
    }

    if (item.name === "Heading 3") {
      headingGroup.push(item);
    }

    if (item.name === "Numbered List") {
      basicBlockGroup.push(item);
    }

    if (item.name === "Bullet List") {
      basicBlockGroup.push(item);
    }

    if (item.name === "Paragraph") {
      basicBlockGroup.push(item);
    }
  }

  const renderedItems = [];
  let index = 0;

  if (headingGroup.length > 0) {
    renderedItems.push(
      <Menu.Label key={"Headings Label"}>{"Headings"}</Menu.Label>
    );

    for (const item of headingGroup) {
      renderedItems.push(
        <SuggestionListItem
          key={item.name}
          name={item.name}
          hint={item.hint}
          icon={item.icon}
          isSelected={props.menuItems.selectedItemIndex === index}
          set={() => props.menuItems.itemCallback(item)}
        />
      );
      index++;
    }
  }

  if (basicBlockGroup.length > 0) {
    renderedItems.push(
      <Menu.Label key={"Basic Blocks Label"}>{"Basic Blocks"}</Menu.Label>
    );

    for (const item of basicBlockGroup) {
      renderedItems.push(
        <SuggestionListItem
          key={item.name}
          name={item.name}
          hint={item.hint}
          icon={item.icon}
          isSelected={props.menuItems.selectedItemIndex === index}
          set={() => props.menuItems.itemCallback(item)}
        />
      );
      index++;
    }
  }

  return (
    <Menu
      /** Hacky fix to get the desired menu behaviour. The trigger="hover"
       * attribute allows focus to remain on the editor, allowing for suggestion
       * filtering. The closeDelay=10000000 attribute allows the menu to stay open
       * practically indefinitely, as normally hovering off it would cause it to
       * close due to trigger="hover".
       */
      defaultOpened={true}
      trigger={"hover"}
      closeDelay={10000000}>
      <Menu.Dropdown className={classes.root}>
        {renderedItems.length > 0 ? (
          renderedItems
        ) : (
          <Menu.Item>No match found</Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
