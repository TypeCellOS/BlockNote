import {
  Block,
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  SideMenuProsemirrorPlugin,
  StyleSchema,
} from "@blocknote/core";
import { useFloating, useTransitionStyles } from "@floating-ui/react";
import { FC, useEffect, useRef, useState } from "react";

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

  const { refs, update, context, floatingStyles } = useFloating({
    open: show,
    placement: "left",
  });

  const { isMounted, styles } = useTransitionStyles(context);

  useEffect(() => {
    return props.editor.sideMenu.onUpdate((sideMenuState) => {
      setShow(sideMenuState.show);
      setBlock(sideMenuState.block);

      referencePos.current = sideMenuState.referencePos;

      update();
    });
  }, [props.editor, update]);

  useEffect(() => {
    refs.setReference({
      getBoundingClientRect: () => referencePos.current!,
    });
  }, [refs]);

  if (!block || !isMounted) {
    return null;
  }

  const SideMenu = props.sideMenu || DefaultSideMenu;

  return (
    <div
      ref={refs.setFloating}
      style={{ ...styles, ...floatingStyles, zIndex: 1000 }}>
      <SideMenu
        block={block}
        editor={props.editor}
        blockDragStart={props.editor.sideMenu.blockDragStart}
        blockDragEnd={props.editor.sideMenu.blockDragEnd}
        addBlock={props.editor.sideMenu.addBlock}
        freezeMenu={props.editor.sideMenu.freezeMenu}
        unfreezeMenu={props.editor.sideMenu.unfreezeMenu}
      />
    </div>
  );
};
