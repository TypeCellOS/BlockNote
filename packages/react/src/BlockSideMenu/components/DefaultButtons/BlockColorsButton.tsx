import { ReactNode, useCallback, useRef, useState } from "react";
import { Box, Menu } from "@mantine/core";
import { BlockSchema, PartialBlock } from "@blocknote/core";
import { HiChevronRight } from "react-icons/hi";
import { DragHandleMenuProps } from "../DragHandleMenu";
import { DragHandleMenuItem } from "../DragHandleMenuItem";
import { ColorPicker } from "../../../SharedComponents/ColorPicker/components/ColorPicker";

export const BlockColorsButton = <BSchema extends BlockSchema>(
  props: DragHandleMenuProps<BSchema> & { children: ReactNode }
) => {
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
    !("textColor" in props.block.props) ||
    !("backgroundColor" in props.block.props)
  ) {
    return null;
  }

  return (
    <DragHandleMenuItem
      closeMenu={props.closeMenu}
      onMouseLeave={startMenuCloseTimer}
      onMouseOver={stopMenuCloseTimer}>
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
          onMouseLeave={startMenuCloseTimer}
          onMouseOver={stopMenuCloseTimer}
          style={{ marginLeft: "5px" }}>
          <ColorPicker
            iconSize={18}
            textColor={props.block.props.textColor || "default"}
            backgroundColor={props.block.props.backgroundColor || "default"}
            setTextColor={(color) =>
              props.editor.updateBlock(props.block, {
                props: { textColor: color },
              } as PartialBlock<BSchema>)
            }
            setBackgroundColor={(color) =>
              props.editor.updateBlock(props.block, {
                props: { backgroundColor: color },
              } as PartialBlock<BSchema>)
            }
          />
        </Menu.Dropdown>
      </Menu>
    </DragHandleMenuItem>
  );
};
