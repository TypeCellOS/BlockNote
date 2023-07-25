import { FC, useEffect, useMemo, useRef, useState } from "react";
import Tippy from "@tippyjs/react";
import {
  BaseUiElementCallbacks,
  BaseUiElementState,
  Block,
  BlockNoteEditor,
  BlockSchema,
  SideMenuCallbacks,
  SideMenuState,
} from "@blocknote/core";

import { DefaultSideMenu } from "./DefaultSideMenu";

export type SideMenuProps<BSchema extends BlockSchema> = Omit<
  SideMenuCallbacks,
  keyof BaseUiElementCallbacks
> &
  Omit<SideMenuState<BSchema>, keyof BaseUiElementState> & {
    editor: BlockNoteEditor<BSchema>;
  };

export const SideMenuPositioner = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
  sideMenu?: FC<SideMenuProps<BSchema>>;
}) => {
  const [show, setShow] = useState<boolean>(false);
  const [block, setBlock] = useState<Block<BSchema>>();

  const referencePos = useRef<DOMRect>();
  const callbacks = useRef<SideMenuCallbacks>();

  useEffect(() => {
    callbacks.current = props.editor.createSideMenu((sideMenuState) => {
      setShow(sideMenuState.show);
      setBlock(sideMenuState.block);

      referencePos.current = sideMenuState.referencePos;
    });

    return callbacks.current!.destroy;
  }, [props.editor]);

  const getReferenceClientRect = useMemo(() => {
    if (!referencePos.current) {
      return undefined;
    }

    return () => referencePos.current!;
  }, [referencePos.current]);

  const sideMenuElement = useMemo(() => {
    if (!block || !callbacks.current) {
      return null;
    }

    const SideMenu = props.sideMenu || DefaultSideMenu;

    return (
      <SideMenu
        block={block}
        editor={props.editor}
        blockDragStart={callbacks.current.blockDragStart}
        blockDragEnd={callbacks.current.blockDragEnd}
        addBlock={callbacks.current.addBlock}
        freezeMenu={callbacks.current.freezeMenu}
        unfreezeMenu={callbacks.current.unfreezeMenu}
      />
    );
  }, [block, props.editor, props.sideMenu]);

  return (
    <Tippy
      appendTo={props.editor.domElement.parentElement!}
      content={sideMenuElement}
      getReferenceClientRect={getReferenceClientRect}
      interactive={true}
      visible={show}
      animation={"fade"}
      offset={offset}
      placement={"left"}
      popperOptions={popperOptions}
    />
  );
};

const offset: [number, number] = [0, 0];
const popperOptions = {
  modifiers: [
    {
      name: "flip",
      options: {
        fallbackPlacements: [],
      },
    },
    {
      name: "preventOverflow",
      options: {
        mainAxis: false,
        altAxis: false,
      },
    },
  ],
};
