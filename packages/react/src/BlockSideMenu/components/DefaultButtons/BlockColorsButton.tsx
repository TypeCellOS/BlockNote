import { ReactNode, useCallback, useRef, useState } from "react";
import { Box, Menu } from "@mantine/core";
import { BlockNoteEditor, BlockSchema, PartialBlock } from "@blocknote/core";
import { HiChevronRight } from "react-icons/hi";
import { ColorPicker } from "../../../SharedComponents/ColorPicker/components/ColorPicker";

export const BlockColorsButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
  closeMenu: () => void;
  children: ReactNode;
}) => {
  const [block] = useState(props.editor.getMouseCursorPosition()?.block);
  const [opened, setOpened] = useState(false);

  const menuCloseTimer = useRef<NodeJS.Timeout | undefined>();

  const startMenuCloseTimer = useCallback(() => {
    if (menuCloseTimer.current) {
      clearTimeout(menuCloseTimer.current);
    }
    menuCloseTimer.current = setTimeout(() => {
      setOpened(false);
    }, 250);
  }, []);

  const stopMenuCloseTimer = useCallback(() => {
    if (menuCloseTimer.current) {
      clearTimeout(menuCloseTimer.current);
    }
    setOpened(true);
  }, []);

  if (
    !block ||
    !("textColor" in block.props) ||
    !("backgroundColor" in block.props)
  ) {
    return null;
  }

  return (
    <Menu.Item
      onMouseLeave={() => {
        startMenuCloseTimer();
      }}
      onMouseOver={() => {
        stopMenuCloseTimer();
      }}>
      <Menu opened={opened} position={"right"}>
        <Menu.Target>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ flex: 1 }}>{props.children}</div>
            <Box style={{ display: "flex", alignItems: "center" }}>
              <HiChevronRight size={15} />
            </Box>
          </div>
        </Menu.Target>
        <Menu.Dropdown
          onMouseLeave={() => {
            startMenuCloseTimer();
          }}
          onMouseOver={() => {
            stopMenuCloseTimer();
          }}
          style={{ marginLeft: "5px" }}>
          <ColorPicker
            onClick={props.closeMenu}
            iconSize={18}
            textColor={block ? block.props.textColor || "default" : "default"}
            backgroundColor={
              block ? block.props.backgroundColor || "default" : "default"
            }
            setTextColor={(color) =>
              block &&
              props.editor.updateBlock(block, {
                props: { textColor: color },
              } as PartialBlock<BSchema>)
            }
            setBackgroundColor={(color) =>
              block &&
              props.editor.updateBlock(block, {
                props: { backgroundColor: color },
              } as PartialBlock<BSchema>)
            }
          />
        </Menu.Dropdown>
      </Menu>
    </Menu.Item>
  );
};
