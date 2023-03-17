import { Box, Menu } from "@mantine/core";
import { useCallback, useRef, useState } from "react";
import { HiChevronRight } from "react-icons/hi";
import { ColorPicker } from "../../SharedComponents/ColorPicker/components/ColorPicker";

export const ColorPickerMenu = (props: {
  onClick?: () => void;
  children: any;
  blockBackgroundColor: string;
  setBlockBackgroundColor: (color: string) => void;
  blockTextColor: string;
  setBlockTextColor: (color: string) => void;
}) => {
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
            onClick={props.onClick}
            iconSize={18}
            textColor={props.blockTextColor}
            setTextColor={props.setBlockTextColor}
            backgroundColor={props.blockBackgroundColor}
            setBackgroundColor={props.setBlockBackgroundColor}
          />
        </Menu.Dropdown>
      </Menu>
    </Menu.Item>
  );
};
