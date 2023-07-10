import { BlockNoteEditor, BlockSchema, createSlashMenu } from "@blocknote/core";
import { Menu, createStyles } from "@mantine/core";
import * as _ from "lodash";
import { useCallback, useEffect, useRef, useState } from "react";
import { ReactSlashMenuItem } from "../ReactSlashMenuItem";
import { SlashMenuItem } from "./SlashMenuItem";
import Tippy from "@tippyjs/react";
import { DefaultBlockSchema, SuggestionsMenuState } from "@blocknote/core";
import { defaultReactSlashMenuItems } from "../defaultReactSlashMenuItems";

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
  const [state, setState] = useState<
    | Omit<
        SuggestionsMenuState<ReactSlashMenuItem<DefaultBlockSchema>>,
        "referencePos"
      >
    | undefined
  >();
  // Since we're using Tippy, we don't want to trigger re-renders when only the
  // reference position changes. So we store it in a ref instead of state.
  const referenceClientRect = useRef<DOMRect | undefined>();

  useEffect(() => {
    createSlashMenu<ReactSlashMenuItem<DefaultBlockSchema>>(
      props.editor as any,
      ({ referencePos, ...state }) => {
        setState(state);
        referenceClientRect.current = referencePos;
      },
      (query) =>
        defaultReactSlashMenuItems.filter(
          (cmd: ReactSlashMenuItem<DefaultBlockSchema>) => cmd.match(query)
        )
    );
  }, [props.editor]);

  const getReferenceClientRect = useCallback(
    () => referenceClientRect.current!,
    [referenceClientRect]
  );

  return (
    <Tippy
      appendTo={props.editor._tiptapEditor.view.dom.parentElement!}
      content={<SlashMenuOld {...state!} />}
      getReferenceClientRect={
        referenceClientRect.current && getReferenceClientRect
      }
      interactive={true}
      visible={state?.show || false}
      animation={"fade"}
      placement={"bottom-start"}
    />
  );
};
