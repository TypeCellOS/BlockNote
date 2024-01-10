import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  SlashMenuProsemirrorPlugin,
  SuggestionsMenuState,
} from "@blocknote/core";
import {
  flip,
  offset,
  size,
  useFloating,
  useTransitionStyles,
} from "@floating-ui/react";
import { FC, useEffect, useRef, useState } from "react";

import { ReactSlashMenuItem } from "../../slashMenuItems/ReactSlashMenuItem";
import { DefaultSlashMenu } from "./DefaultSlashMenu";

export type SlashMenuProps<BSchema extends BlockSchema = DefaultBlockSchema> =
  Pick<
    SlashMenuProsemirrorPlugin<BSchema, any, any, any>,
    "executeItem" | "closeMenu" | "clearQuery"
  > &
    Pick<SuggestionsMenuState<ReactSlashMenuItem<BSchema>>, "items"> & {
      editor: BlockNoteEditor<BSchema, any, any>;
    };

export const SlashMenuPositioner = <
  BSchema extends BlockSchema = DefaultBlockSchema
>(props: {
  editor: BlockNoteEditor<BSchema, any, any>;
  slashMenu?: FC<SlashMenuProps<BSchema>>;
}) => {
  const [show, setShow] = useState<boolean>(false);
  const [items, setItems] = useState<Promise<ReactSlashMenuItem<BSchema>[]>>(
    new Promise((resolve) => resolve([]))
  );

  const referencePos = useRef<DOMRect>();

  const { refs, update, context, floatingStyles } = useFloating({
    open: show,
    placement: "bottom-start",
    middleware: [
      offset(10),
      // Flips the slash menu placement to maximize the space available, and
      // prevents the menu from being cut off by the confines of the screen.
      flip(),
      size({
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${availableHeight - 10}px`,
          });
        },
      }),
    ],
  });

  const { isMounted, styles } = useTransitionStyles(context);

  useEffect(() => {
    return props.editor.slashMenu.onUpdate((slashMenuState) => {
      setShow(slashMenuState.show);
      setItems(slashMenuState.items);

      referencePos.current = slashMenuState.referencePos;

      update();
    });
  }, [props.editor, show, update]);

  useEffect(() => {
    refs.setReference({
      getBoundingClientRect: () => referencePos.current!,
    });
  }, [refs]);

  if (!isMounted || !items === undefined) {
    return null;
  }

  const SlashMenu = props.slashMenu || DefaultSlashMenu;

  return (
    <div
      ref={refs.setFloating}
      style={{
        display: "flex",
        ...styles,
        ...floatingStyles,
        zIndex: 2000,
      }}>
      <SlashMenu
        editor={props.editor}
        items={items}
        executeItem={props.editor.slashMenu.executeItem}
        closeMenu={props.editor.slashMenu.closeMenu}
        clearQuery={props.editor.slashMenu.clearQuery}
      />
    </div>
  );
};
