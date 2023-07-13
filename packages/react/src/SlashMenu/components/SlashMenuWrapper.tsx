import { FC, useEffect, useMemo, useRef, useState } from "react";
import Tippy from "@tippyjs/react";
import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  createSlashMenu,
  SuggestionsPluginCallbacks,
  BaseUiElementCallbacks,
  SuggestionsMenuState,
  BaseUiElementState,
} from "@blocknote/core";

import { ReactSlashMenuItem } from "../ReactSlashMenuItem";
import { defaultReactSlashMenuItems } from "../defaultReactSlashMenuItems";
import { DefaultSlashMenu } from "./DefaultSlashMenu";

export type SlashMenuProps = Omit<
  SuggestionsPluginCallbacks<ReactSlashMenuItem<DefaultBlockSchema>>,
  keyof BaseUiElementCallbacks
> &
  Omit<
    SuggestionsMenuState<ReactSlashMenuItem<DefaultBlockSchema>>,
    keyof BaseUiElementState
  >;

export const SlashMenuWrapper = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
  slashMenuItems?: ReactSlashMenuItem<DefaultBlockSchema>[];
  slashMenu?: FC<SlashMenuProps>;
}) => {
  const [show, setShow] = useState<boolean>(false);
  const [filteredItems, setFilteredItems] =
    useState<ReactSlashMenuItem<DefaultBlockSchema>[]>();
  const [keyboardHoveredItemIndex, setKeyboardHoveredItemIndex] =
    useState<number>();

  const referencePos = useRef<DOMRect>();
  const callbacks =
    useRef<
      SuggestionsPluginCallbacks<ReactSlashMenuItem<DefaultBlockSchema>>
    >();

  useEffect(() => {
    callbacks.current = createSlashMenu<ReactSlashMenuItem<DefaultBlockSchema>>(
      props.editor as any,
      (slashMenuState) => {
        setShow(slashMenuState.show);
        setFilteredItems(slashMenuState.filteredItems);
        setKeyboardHoveredItemIndex(slashMenuState.keyboardHoveredItemIndex);

        referencePos.current = slashMenuState.referencePos;
      },
      props.slashMenuItems || defaultReactSlashMenuItems
    );

    return callbacks.current!.destroy;
  }, [props.editor, props.slashMenuItems]);

  const getReferenceClientRect = useMemo(() => {
    if (!referencePos.current) {
      return undefined;
    }

    return () => referencePos.current!;
  }, [referencePos.current]);

  const slashMenuElement = useMemo(() => {
    if (
      !filteredItems ||
      keyboardHoveredItemIndex === undefined ||
      !callbacks.current
    ) {
      return null;
    }

    const SlashMenu = props.slashMenu || DefaultSlashMenu;

    return (
      <SlashMenu
        filteredItems={filteredItems!}
        itemCallback={(item) => callbacks.current!.itemCallback(item)}
        keyboardHoveredItemIndex={keyboardHoveredItemIndex!}
      />
    );
  }, [filteredItems, keyboardHoveredItemIndex, props.slashMenu]);

  return (
    <Tippy
      content={slashMenuElement}
      getReferenceClientRect={getReferenceClientRect}
      interactive={true}
      visible={show}
      animation={"fade"}
      placement={"bottom-start"}>
      <div />
    </Tippy>
  );
};
