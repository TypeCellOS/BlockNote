import { useEffect, useMemo, useRef, useState } from "react";
import Tippy from "@tippyjs/react";
import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  createSlashMenu,
  SuggestionsPluginCallbacks,
} from "@blocknote/core";

import { ReactSlashMenuItem } from "../ReactSlashMenuItem";
import { defaultReactSlashMenuItems } from "../defaultReactSlashMenuItems";
import { DefaultSlashMenu } from "./DefaultSlashMenu";

export const SlashMenuWrapper = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const [show, setShow] = useState<boolean>(false);
  const [items, setItems] =
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
        setItems(slashMenuState.items);
        setKeyboardHoveredItemIndex(slashMenuState.keyboardHoveredItemIndex);

        referencePos.current = slashMenuState.referencePos;
      },
      (query) =>
        defaultReactSlashMenuItems.filter(
          (cmd: ReactSlashMenuItem<DefaultBlockSchema>) => cmd.match(query)
        )
    );

    return callbacks.current!.destroy;
  }, [props.editor]);

  const getReferenceClientRect = useMemo(() => {
    if (!referencePos.current) {
      return undefined;
    }

    return () => referencePos.current!;
  }, [referencePos.current]);

  const slashMenu = useMemo(() => {
    if (
      !items ||
      keyboardHoveredItemIndex === undefined ||
      !callbacks.current
    ) {
      return null;
    }

    return (
      <DefaultSlashMenu
        items={items!}
        itemCallback={(item) => callbacks.current!.itemCallback(item)}
        keyboardHoveredItemIndex={keyboardHoveredItemIndex!}
      />
    );
  }, [items, keyboardHoveredItemIndex]);

  return (
    <Tippy
      content={slashMenu}
      getReferenceClientRect={getReferenceClientRect}
      interactive={true}
      visible={show}
      animation={"fade"}
      placement={"bottom-start"}>
      <div />
    </Tippy>
  );
};
