import { Box, Menu } from "@mantine/core";
import { HiChevronRight } from "react-icons/hi";
import { ColorPicker } from "../../SharedComponents/ColorPicker/components/ColorPicker";
import { useCallback, useState } from "react";

export const ColorPickerMenu = (props: {
  onClick?: () => void;

  blockBackgroundColor: string;
  setBlockBackgroundColor: (color: string) => void;
  blockTextColor: string;
  setBlockTextColor: (color: string) => void;
}) => {
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
          onClick={props.onClick}
          iconSize={18}
          textColor={props.blockTextColor}
          setTextColor={props.setBlockTextColor}
          backgroundColor={props.blockBackgroundColor}
          setBackgroundColor={props.setBlockBackgroundColor}
        />
      </Menu.Dropdown>
    </Menu>
  );
};
