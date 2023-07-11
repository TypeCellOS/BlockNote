import {
  BlockNoteEditor,
  BlockSchema,
  createSideMenu,
  SideMenuState,
} from "@blocknote/core";
import { ActionIcon, Group, Menu } from "@mantine/core";
import Tippy from "@tippyjs/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AiOutlinePlus } from "react-icons/ai";
import { MdDragIndicator } from "react-icons/md";
import { DefaultDragHandleMenu } from "./DefaultDragHandleMenu";

export const BlockSideMenuOld = <BSchema extends BlockSchema>(
  props: Omit<SideMenuState<BSchema>, "referencePos"> & {
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

  const closeMenu = () => {
    // TODO: I don't think this is needed / used?
    // props.unfreezeMenu();
  };

  const DragHandleMenu = DefaultDragHandleMenu;

  return (
    <Group spacing={0}>
      <ActionIcon size={24} data-test={"dragHandleAdd"}>
        {
          <AiOutlinePlus
            size={24}
            onClick={() => {
              props.addBlock();
            }}
          />
        }
      </ActionIcon>
      <Menu
        trigger={"click"}
        onOpen={() => props.freezeMenu()}
        onClose={() => props.unfreezeMenu()}
        width={100}
        position={"left"}>
        <Menu.Target>
          <div draggable="true" ref={dragHandleRef}>
            <ActionIcon size={24} data-test={"dragHandle"}>
              {<MdDragIndicator size={24} />}
            </ActionIcon>
          </div>
        </Menu.Target>
        <DragHandleMenu
          editor={props.editor}
          block={props.block}
          closeMenu={closeMenu}
        />
      </Menu>
    </Group>
  );
};

export const SideMenu = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const [state, setState] = useState<SideMenuState<BSchema>>();

  useEffect(() => {
    return createSideMenu(props.editor, (state) => {
      setState({ ...state });
    });
  }, [props.editor]);

  const getReferenceClientRect = useMemo(() => {
    // TODO: test
    console.log(
      "new reference pos, this should only be triggered when hovering a new block"
    );
    if (!state?.referencePos) {
      return undefined;
    }
    return () => state.referencePos;
  }, [state?.referencePos]);

  return (
    <Tippy
      // I got rid of this and added the <div /> below + moved <BlockSideMenu /> to
      // appendTo={props.editor._tiptapEditor.view.dom.parentElement!}
      content={<BlockSideMenuOld {...state!} editor={props.editor} />}
      getReferenceClientRect={getReferenceClientRect}
      interactive={true}
      visible={state?.show || false}
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
