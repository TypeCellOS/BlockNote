import {
  BlockNoteEditor,
  BlockSchema,
  createSideMenu,
  SideMenuState,
} from "@blocknote/core";
import { ActionIcon, Menu } from "@mantine/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { AiOutlinePlus } from "react-icons/ai";
import { MdDragIndicator } from "react-icons/md";
import { DefaultDragHandleMenu } from "./DefaultDragHandleMenu";
import Tippy from "@tippyjs/react";

export const BlockSideMenuOld = <BSchema extends BlockSchema>(
  props: Omit<SideMenuState<BSchema>, "referencePos"> & {
    editor: BlockNoteEditor<BSchema>;
  }
) => {
  const [dragHandleMenuOpened, setDragHandleMenuOpened] = useState(false);

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
    setDragHandleMenuOpened(false);
    props.unfreezeMenu();
  };

  const DragHandleMenu = DefaultDragHandleMenu;

  return (
    <div style={{ display: "flex", flexDirection: "row" }}>
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
      <Menu opened={dragHandleMenuOpened} width={100} position={"left"}>
        <Menu.Target>
          <div draggable="true" ref={dragHandleRef}>
            <ActionIcon
              onClick={() => {
                setDragHandleMenuOpened(true);
                props.freezeMenu();
              }}
              size={24}
              data-test={"dragHandle"}>
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
    </div>
  );
};

export const SideMenu = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const [state, setState] = useState<
    Omit<SideMenuState<BSchema>, "referencePos"> | undefined
  >();
  // Since we're using Tippy, we don't want to trigger re-renders when only the
  // reference position changes. So we store it in a ref instead of state.
  const referenceClientRect = useRef<DOMRect | undefined>();

  useEffect(() => {
    createSideMenu(props.editor, ({ referencePos, ...state }) => {
      setState(state);
      referenceClientRect.current = referencePos;
    });
  }, [props.editor]);

  const getReferenceClientRect = useCallback(
    () => referenceClientRect.current!,
    [referenceClientRect]
  );

  return (
    <Tippy
      appendTo={props.editor._tiptapEditor.view.dom.parentElement!}
      content={<BlockSideMenuOld {...state!} editor={props.editor} />}
      getReferenceClientRect={
        referenceClientRect.current && getReferenceClientRect
      }
      interactive={true}
      visible={state?.show || false}
      animation={"fade"}
      offset={[0, 0]}
      placement={"left"}
      popperOptions={{
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
      }}
    />
  );
};
