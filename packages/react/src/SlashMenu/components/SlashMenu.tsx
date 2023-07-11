import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  SuggestionsMenuState,
  createSlashMenu,
} from "@blocknote/core";
import { Menu, createStyles } from "@mantine/core";
import Tippy from "@tippyjs/react";
import * as _ from "lodash";
import { useEffect, useMemo, useState } from "react";
import { ReactSlashMenuItem } from "../ReactSlashMenuItem";
import { defaultReactSlashMenuItems } from "../defaultReactSlashMenuItems";
import { SlashMenuItem } from "./SlashMenuItem";

export function SlashMenuOld(
  props: Omit<
    SuggestionsMenuState<ReactSlashMenuItem<DefaultBlockSchema>>,
    "referencePos"
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

export const SlashMenu = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const [state, setState] =
    useState<SuggestionsMenuState<ReactSlashMenuItem<DefaultBlockSchema>>>();

  useEffect(() => {
    return createSlashMenu<ReactSlashMenuItem<DefaultBlockSchema>>(
      props.editor as any,
      ({ ...state }) => {
        setState(state);
      },
      (query) =>
        defaultReactSlashMenuItems.filter(
          (cmd: ReactSlashMenuItem<DefaultBlockSchema>) => cmd.match(query)
        )
    );
  }, [props.editor]);

  const getReferenceClientRect = useMemo(() => {
    // TODO: test and remove
    console.log(
      "new reference pos for SLASHMENU, this should only be triggered when slashmenu position changes"
    );
    if (!state?.referencePos) {
      return undefined;
    }
    return () => state.referencePos;
  }, [state?.referencePos]);

  return (
    <Tippy
      content={<SlashMenuOld {...state!} />}
      getReferenceClientRect={getReferenceClientRect}
      interactive={true}
      visible={state?.show || false}
      animation={"fade"}
      placement={"bottom-start"}>
      <div />
    </Tippy>
  );
};
