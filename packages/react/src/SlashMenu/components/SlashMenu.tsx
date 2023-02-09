import { SlashMenuItem } from "@blocknote/core";
import { createStyles, Menu } from "@mantine/core";
import * as _ from "lodash";
import { SlashMenuItem as ReactSlashMenuItem } from "./SlashMenuItem";

export type SlashMenuProps = {
  items: SlashMenuItem[];
  keyboardHoveredItemIndex: number;
  itemCallback: (item: SlashMenuItem) => void;
};

export function SlashMenu(props: SlashMenuProps) {
  const { classes } = createStyles({ root: {} })(undefined, {
    name: "SlashMenu",
  });
  const renderedItems: any[] = [];
  let index = 0;

  const groups = _.groupBy(props.items, (i) => i.group);

  _.forEach(groups, (el) => {
    renderedItems.push(
      <Menu.Label key={el[0].group}>{el[0].group}</Menu.Label>
    );

    for (const item of el) {
      renderedItems.push(
        <ReactSlashMenuItem
          key={item.name}
          name={item.name}
          hint={item.hint}
          shortcut={item.shortcut}
          isSelected={props.keyboardHoveredItemIndex === index}
          set={() => props.itemCallback(item)}
        />
      );
      index++;
    }
  });

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
