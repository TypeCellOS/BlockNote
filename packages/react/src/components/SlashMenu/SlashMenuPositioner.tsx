import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  SlashMenuProsemirrorPlugin,
  SuggestionsMenuState,
} from "@blocknote/core";
import Tippy from "@tippyjs/react";
import { FC, useEffect, useMemo, useRef, useState } from "react";

import { usePreventMenuOverflow } from "../../hooks/usePreventMenuOverflow";
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

  useEffect(() => {
    return props.editor.slashMenu.onUpdate((slashMenuState) => {
      setShow(slashMenuState.show);
      setFilteredItems(slashMenuState.filteredItems);
      setKeyboardHoveredItemIndex(slashMenuState.keyboardHoveredItemIndex);

      referencePos.current = slashMenuState.referencePos;
    });
  }, [props.editor]);

  const getReferenceClientRect = useMemo(
    () => {
      if (!referencePos.current) {
        return undefined;
      }

      return () => referencePos.current!;
    },
    [referencePos.current] // eslint-disable-line
  );

  const { ref, updateMaxHeight } = usePreventMenuOverflow();

  const slashMenuElement = useMemo(() => {
    if (!filteredItems || keyboardHoveredItemIndex === undefined) {
      return null;
    }

    const SlashMenu = props.slashMenu || DefaultSlashMenu;

    return (
      <div ref={ref}>
        <SlashMenu
          filteredItems={filteredItems}
          itemCallback={(item) => props.editor.slashMenu.itemCallback(item)}
          keyboardHoveredItemIndex={keyboardHoveredItemIndex}
        />
      </div>
    );
  }, [
    filteredItems,
    keyboardHoveredItemIndex,
    props.editor.slashMenu,
    props.slashMenu,
    ref,
  ]);

  return (
    <Tippy
      onShow={updateMaxHeight}
      appendTo={props.editor.domElement.parentElement!}
      content={slashMenuElement}
      getReferenceClientRect={getReferenceClientRect}
      interactive={true}
      visible={show}
      animation={"fade"}
      placement={"bottom-start"}
      zIndex={2000}
    />
  );
};
