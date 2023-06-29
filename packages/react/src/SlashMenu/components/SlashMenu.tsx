import {
  BaseSlashMenuItem,
  BlockNoteEditor,
  BlockSchema,
  createSuggestionPlugin,
  defaultSlashMenuItems,
} from "@blocknote/core";
import { Menu, createStyles } from "@mantine/core";
import * as _ from "lodash";
import { useCallback, useEffect, useRef, useState } from "react";
import { ReactSlashMenuItem } from "../ReactSlashMenuItem";
import { SlashMenuItem } from "./SlashMenuItem";

import Tippy from "@tippyjs/react";
import { PluginKey } from "prosemirror-state";
export type SlashMenuProps<BSchema extends BlockSchema> = {
  items: ReactSlashMenuItem<BSchema>[];
  keyboardHoveredItemIndex: number;
  itemCallback: (item: ReactSlashMenuItem<BSchema>) => void;
};

export function SlashMenu<BSchema extends BlockSchema>(
  props: SlashMenuProps<BSchema>
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

export const SlashMenu2 = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const [params, setParams] = useState<any>();
  const [isHidden, setIsHidden] = useState<boolean>(true);

  const elementRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!elementRef.current || !props.editor) {
      return;
    }

    if (props.editor._tiptapEditor.isDestroyed) {
      return;
    }

    const pluginKey = new PluginKey("SlashMenu2");

    const plugin = createSuggestionPlugin<BaseSlashMenuItem<BSchema>, BSchema>({
      pluginKey,
      editor: props.editor!,
      defaultTriggerCharacter: "/",
      suggestionsMenuFactory: () => ({
        element: elementRef.current!,
        render: (params, isHidden) => {
          console.log("params", params.referenceRect);
          setParams(params);
          setIsHidden(false);
        },
        hide: () => {
          setIsHidden(true);
        },
      }),
      items: (query) => {
        return defaultSlashMenuItems.filter((cmd: BaseSlashMenuItem<BSchema>) =>
          cmd.match(query)
        );
      },
      onSelectItem: ({ item, editor }) => {
        item.execute(editor);
      },
    });

    props.editor._tiptapEditor.registerPlugin(plugin);
    return () => props.editor._tiptapEditor.unregisterPlugin(pluginKey);
  }, [props.editor, elementRef.current]);
  console.log("FormattingToolbar", params, isHidden);

  const getReferenceClientRect = useCallback(
    () => params.referenceRect,
    [params]
  );

  return (
    <div ref={elementRef}>
      {elementRef.current && props.editor && params && (
        // <EditorElementComponentWrapper
        //   dynamicParams={params}
        //   // editor={props.editor}
        //   // isHidden={isHidden}
        //   rootElement={elementRef.current!}
        //   staticParams={{
        //     editor: props.editor,
        //   }}
        //   isOpen={!isHidden}
        //   theme={getBlockNoteTheme()}
        //   editorElementComponent={
        //     SlashMenu as any
        //   }></EditorElementComponentWrapper>
        <Tippy
          appendTo={document.body}
          content={<SlashMenu editor={props.editor} {...params} />}
          getReferenceClientRect={getReferenceClientRect}
          interactive={true}
          // onShow={onShow}
          // onHidden={onHidden}
          visible={true}
          // popperOptions={{
          //   modifiers: [
          //     {
          //       name: "preventOverflow",
          //       options: {
          //         altAxis: true, // false by default
          //         altBoundary: true,
          //       },
          //     },
          //   ],
          // }}
          // {...props.tippyProps}
        >
          <div />
        </Tippy>
      )}
    </div>
  );
};
