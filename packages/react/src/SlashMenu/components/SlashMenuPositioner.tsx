import { FC, useEffect, useMemo, useRef, useState } from "react";
import Tippy from "@tippyjs/react";
import {
  BlockNoteEditor,
  BlockSchema,
  BaseUiElementCallbacks,
  SuggestionsMenuState,
  BaseUiElementState,
  SuggestionsMenuCallbacks,
  DefaultBlockSchema,
} from "@blocknote/core";

import { ReactSlashMenuItem } from "../ReactSlashMenuItem";
import { DefaultSlashMenu } from "./DefaultSlashMenu";

export type SlashMenuProps<BSchema extends BlockSchema = DefaultBlockSchema> =
  Omit<
    SuggestionsMenuCallbacks<ReactSlashMenuItem<BSchema>>,
    keyof BaseUiElementCallbacks
  > &
    Omit<
      SuggestionsMenuState<ReactSlashMenuItem<BSchema>>,
      keyof BaseUiElementState
    >;

export const SlashMenuPositioner = <
  BSchema extends BlockSchema = DefaultBlockSchema
>(props: {
  editor: BlockNoteEditor<BSchema>;
  slashMenu?: FC<SlashMenuProps<BSchema>>;
}) => {
  const [show, setShow] = useState<boolean>(false);
  const [filteredItems, setFilteredItems] =
    useState<ReactSlashMenuItem<BSchema>[]>();
  const [keyboardHoveredItemIndex, setKeyboardHoveredItemIndex] =
    useState<number>();

  const referencePos = useRef<DOMRect>();
  const callbacks =
    useRef<SuggestionsMenuCallbacks<ReactSlashMenuItem<BSchema>>>();

  useEffect(() => {
    callbacks.current = props.editor.createSlashMenu((slashMenuState) => {
      setShow(slashMenuState.show);
      setFilteredItems(
        slashMenuState.filteredItems as ReactSlashMenuItem<BSchema>[]
      );
      setKeyboardHoveredItemIndex(slashMenuState.keyboardHoveredItemIndex);

      referencePos.current = slashMenuState.referencePos;
    }) as SuggestionsMenuCallbacks<ReactSlashMenuItem<BSchema>>;

    return callbacks.current!.destroy;
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
      appendTo={props.editor.domElement.parentElement!}
      content={slashMenuElement}
      getReferenceClientRect={getReferenceClientRect}
      interactive={true}
      visible={show}
      animation={"fade"}
      placement={"bottom-start"}
    />
  );
};
