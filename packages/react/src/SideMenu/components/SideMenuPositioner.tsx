import {
  Block,
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  SideMenuProsemirrorPlugin,
} from "@blocknote/core";
import Tippy from "@tippyjs/react";
import { FC, useEffect, useMemo, useRef, useState } from "react";

import { StyleSchema } from "@blocknote/core";
import { DefaultSideMenu } from "./DefaultSideMenu";
import { DragHandleMenuProps } from "./DragHandleMenu/DragHandleMenu";

export type SideMenuProps<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
> = Pick<
  SideMenuProsemirrorPlugin<BSchema, I, S>,
  "blockDragStart" | "blockDragEnd" | "addBlock" | "freezeMenu" | "unfreezeMenu"
> & {
  block: Block<BSchema, I, S>;
  editor: BlockNoteEditor<BSchema, I, S>;
  dragHandleMenu?: FC<DragHandleMenuProps<BSchema, I, S>>;
};

export const SideMenuPositioner = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  editor: BlockNoteEditor<BSchema, I, S>;
  sideMenu?: FC<SideMenuProps<BSchema, I, S>>;
}) => {
  const [show, setShow] = useState<boolean>(false);
  const [block, setBlock] = useState<Block<BSchema, I, S>>();

  const referencePos = useRef<DOMRect>();

  useEffect(() => {
    return props.editor.sideMenu.onUpdate((sideMenuState) => {
      setShow(sideMenuState.show);
      setBlock(sideMenuState.block);
      referencePos.current = sideMenuState.referencePos;
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

  const sideMenuElement = useMemo(() => {
    if (!block) {
      return null;
    }

    const SideMenu = props.sideMenu || DefaultSideMenu;

    return (
      <SideMenu
        block={block}
        editor={props.editor}
        blockDragStart={props.editor.sideMenu.blockDragStart}
        blockDragEnd={props.editor.sideMenu.blockDragEnd}
        addBlock={props.editor.sideMenu.addBlock}
        freezeMenu={props.editor.sideMenu.freezeMenu}
        unfreezeMenu={props.editor.sideMenu.unfreezeMenu}
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
      zIndex={1000}
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
