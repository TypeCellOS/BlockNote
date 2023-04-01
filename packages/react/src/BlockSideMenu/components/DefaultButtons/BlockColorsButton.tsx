import { BlockNoteEditor } from "@blocknote/core";
import { useCallback, useState } from "react";
import { Box, Menu } from "@mantine/core";
import { HiChevronRight } from "react-icons/hi";
import { ColorPicker } from "../../../SharedComponents/ColorPicker/components/ColorPicker";

export const BlockColorsButton = (props: {
  editor: BlockNoteEditor;
  closeMenu: () => void;
}) => {
  const [block] = useState(props.editor.getMouseCursorPosition()?.block);
  const [opened, setOpened] = useState(false);
  const [menuCloseTimer, setMenuCloseTimer] = useState<
    NodeJS.Timeout | undefined
  >(undefined);
  const [buttonBackground, setButtonBackground] = useState<string | undefined>(
    undefined
  );

  const startMenuCloseTimer = useCallback(() => {
    setMenuCloseTimer(
      setTimeout(() => {
        setOpened(false);
      }, 250)
    );
  }, []);

  const stopMenuCloseTimer = useCallback(() => {
    if (menuCloseTimer) {
      clearTimeout(menuCloseTimer);
      setMenuCloseTimer(undefined);
    }
    setOpened(true);
  }, [menuCloseTimer]);

  return (
    <Menu opened={opened}>
      <Menu.Item
        style={{
          backgroundColor: buttonBackground,
        }}
        component={"div"}
        onMouseLeave={() => {
          startMenuCloseTimer();
          setButtonBackground(undefined);
        }}
        onMouseOver={() => {
          stopMenuCloseTimer();
          setButtonBackground("#f1f3f5");
        }}
        rightSection={
          <Box style={{ display: "flex", alignItems: "center" }}>
            <HiChevronRight size={15} />
          </Box>
        }>
        Colors
      </Menu.Item>
      <Menu.Dropdown
        // @ts-ignore
        onMouseLeave={() => {
          startMenuCloseTimer();
          setButtonBackground(undefined);
        }}
        onMouseOver={() => {
          stopMenuCloseTimer();
          setButtonBackground("#f1f3f5");
        }}
        style={{ marginLeft: "90px" }}>
        <ColorPicker
          onClick={props.closeMenu}
          iconSize={18}
          textColor={block ? block.props.textColor || "default" : "default"}
          backgroundColor={
            block ? block.props.backgroundColor || "default" : "default"
          }
          setTextColor={(color) =>
            block &&
            props.editor.updateBlock(block, { props: { textColor: color } })
          }
          setBackgroundColor={(color) =>
            block &&
            props.editor.updateBlock(block, {
              props: { backgroundColor: color },
            })
          }
        />
      </Menu.Dropdown>
    </Menu>
  );
};
