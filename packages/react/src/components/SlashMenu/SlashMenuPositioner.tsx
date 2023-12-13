import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  SlashMenuProsemirrorPlugin,
  SuggestionsMenuState,
} from "@blocknote/core";
import { FC, useEffect, useRef, useState } from "react";

import { flip, useFloating, useTransitionStyles } from "@floating-ui/react";
import { ReactSlashMenuItem } from "../../slashMenuItems/ReactSlashMenuItem";
import { DefaultSlashMenu } from "./DefaultSlashMenu";

export type SlashMenuProps<BSchema extends BlockSchema = DefaultBlockSchema> =
  Pick<SlashMenuProsemirrorPlugin<BSchema, any, any, any>, "itemCallback"> &
    Pick<
      SuggestionsMenuState<ReactSlashMenuItem<BSchema>>,
      "filteredItems" | "keyboardHoveredItemIndex"
    >;

export const SlashMenuPositioner = <
  BSchema extends BlockSchema = DefaultBlockSchema
>(props: {
  editor: BlockNoteEditor<BSchema, any, any>;
  slashMenu?: FC<SlashMenuProps<BSchema>>;
}) => {
  const [show, setShow] = useState<boolean>(false);
  const [filteredItems, setFilteredItems] =
    useState<ReactSlashMenuItem<BSchema>[]>();
  const [keyboardHoveredItemIndex, setKeyboardHoveredItemIndex] =
    useState<number>();

  const referencePos = useRef<DOMRect>();

  const { refs, update, context, floatingStyles } = useFloating({
    open: show,
    placement: "bottom-start",
    middleware: [flip()],
  });

  const { isMounted, styles } = useTransitionStyles(context);

  useEffect(() => {
    return props.editor.slashMenu.onUpdate((slashMenuState) => {
      setShow(slashMenuState.show);
      setFilteredItems(slashMenuState.filteredItems);
      setKeyboardHoveredItemIndex(slashMenuState.keyboardHoveredItemIndex);

      referencePos.current = slashMenuState.referencePos;
      update();
    });
  }, [props.editor, update]);

  // const { ref, updateMaxHeight } = usePreventMenuOverflow(); // TODO, needed?

  useEffect(() => {
    refs.setReference({
      getBoundingClientRect: () => {
        console.log(referencePos.current);
        return referencePos.current!;
      },
    });
  }, [refs]);

  useEffect(() => {
    refs.setReference({
      getBoundingClientRect: () => referencePos.current!,
    });
  }, [refs]);

  if (!isMounted || !filteredItems || keyboardHoveredItemIndex === undefined) {
    return null;
  }

  const SlashMenu = props.slashMenu || DefaultSlashMenu;

  return (
    <div
      ref={refs.setFloating}
      style={{ ...styles, ...floatingStyles, zIndex: 10000 }}>
      <SlashMenu
        filteredItems={filteredItems}
        itemCallback={(item) => props.editor.slashMenu.itemCallback(item)}
        keyboardHoveredItemIndex={keyboardHoveredItemIndex}
      />
    </div>
  );
};
