import { createStyles, Menu } from "@mantine/core";
import * as _ from "lodash";
import {
  BaseUiElementCallbacks,
  BaseUiElementState,
  DefaultBlockSchema,
  SuggestionsMenuState,
  SuggestionsPluginCallbacks,
} from "@blocknote/core";

import { ReactSlashMenuItem } from "../ReactSlashMenuItem";
import { SlashMenuItem } from "./SlashMenuItem";

export function DefaultSlashMenu(
  props: Omit<
    SuggestionsPluginCallbacks<ReactSlashMenuItem<DefaultBlockSchema>>,
    keyof BaseUiElementCallbacks
  > &
    Omit<
      SuggestionsMenuState<ReactSlashMenuItem<DefaultBlockSchema>>,
      keyof BaseUiElementState
    >
) {
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
        <SlashMenuItem
          key={item.name}
          name={item.name}
          icon={item.icon}
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
      <Menu.Dropdown
        // TODO: This should go back in the plugin.
        onMouseDown={(event) => event.preventDefault()}
        className={classes.root}>
        {renderedItems.length > 0 ? (
          renderedItems
        ) : (
          <Menu.Item>No match found</Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
