import {
  BaseUiElementCallbacks,
  BaseUiElementState,
  Block,
  BlockNoteEditor,
  BlockSchema,
  createSideMenu,
  SideMenuCallbacks,
  SideMenuState,
} from "@blocknote/core";
import { ActionIcon, Group, Menu } from "@mantine/core";
import Tippy from "@tippyjs/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AiOutlinePlus } from "react-icons/ai";
import { MdDragIndicator } from "react-icons/md";
import { DefaultDragHandleMenu } from "./DefaultDragHandleMenu";

export const BlockSideMenuOld = <BSchema extends BlockSchema>(
  props: Omit<SideMenuCallbacks, keyof BaseUiElementCallbacks> &
    Omit<SideMenuState<BSchema>, keyof BaseUiElementState> & {
      editor: BlockNoteEditor<BSchema>;
    }
) => {
  const dragHandleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dragHandle = dragHandleRef.current;

    if (dragHandle instanceof HTMLDivElement) {
      dragHandle.addEventListener("dragstart", props.blockDragStart);
      dragHandle.addEventListener("dragend", props.blockDragEnd);

      return () => {
        dragHandle.removeEventListener("dragstart", props.blockDragStart);
        dragHandle.removeEventListener("dragend", props.blockDragEnd);
      };
    }

    return;
  }, [props.blockDragEnd, props.blockDragStart]);

  const DragHandleMenu = DefaultDragHandleMenu;

  return (
    <Group spacing={0}>
      <ActionIcon size={24} data-test={"dragHandleAdd"}>
        <AiOutlinePlus size={24} onClick={props.addBlock} />
      </ActionIcon>
      <Menu
        trigger={"click"}
        onOpen={props.freezeMenu}
        onClose={props.unfreezeMenu}
        width={100}
        position={"left"}>
        <Menu.Target>
          <div draggable="true" ref={dragHandleRef}>
            <ActionIcon size={24} data-test={"dragHandle"}>
              {<MdDragIndicator size={24} />}
            </ActionIcon>
          </div>
        </Menu.Target>
        <DragHandleMenu editor={props.editor} block={props.block} />
      </Menu>
    </Group>
  );
};

export const SideMenu = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const [show, setShow] = useState<boolean>(false);
  const [block, setBlock] = useState<Block<BSchema>>();

  const referencePos = useRef<DOMRect>();
  const callbacks = useRef<SideMenuCallbacks>();

  useEffect(() => {
    callbacks.current = createSideMenu(props.editor, (sideMenuState) => {
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

  const sideMenu = useMemo(() => {
    if (!block || !callbacks.current) {
      return null;
    }

    return (
      <BlockSideMenuOld
        block={block}
        editor={props.editor}
        blockDragStart={callbacks.current.blockDragStart}
        blockDragEnd={callbacks.current.blockDragEnd}
        addBlock={callbacks.current.addBlock}
        freezeMenu={callbacks.current.freezeMenu}
        unfreezeMenu={callbacks.current.unfreezeMenu}
      />
    );
  }, [block, props.editor]);

  return (
    <Tippy
      // I got rid of this and added the <div /> below + moved <BlockSideMenu /> to
      // appendTo={props.editor._tiptapEditor.view.dom.parentElement!}
      content={sideMenu}
      getReferenceClientRect={getReferenceClientRect}
      interactive={true}
      visible={show}
      animation={"fade"}
      offset={offset}
      placement={"left"}
      popperOptions={popperOptions}>
      <div />
    </Tippy>
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
