import { BlockSchema, PartialBlock } from "@blocknote/core";
import { Box, Menu } from "@mantine/core";
import { ReactNode, useCallback, useRef, useState } from "react";
import { HiChevronRight } from "react-icons/hi";

import { usePreventMenuOverflow } from "../../../../hooks/usePreventMenuOverflow";
import { ColorPicker } from "../../../../components-shared/ColorPicker/ColorPicker";
import type { DragHandleMenuProps } from "../DragHandleMenu";
import { DragHandleMenuItem } from "../DragHandleMenuItem";

export const BlockColorsButton = <BSchema extends BlockSchema>(
  props: DragHandleMenuProps<BSchema, any, any> & { children: ReactNode }
) => {
  const [opened, setOpened] = useState(false);

  const { ref, updateMaxHeight } = usePreventMenuOverflow();

  const menuCloseTimer = useRef<ReturnType<typeof setTimeout> | undefined>();

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

    if (!opened) {
      updateMaxHeight();
    }

    setOpened(true);
  }, [opened, updateMaxHeight]);

  if (
    !("textColor" in props.block.props) &&
    !("backgroundColor" in props.block.props)
  ) {
    return null;
  }

  return (
    <DragHandleMenuItem
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
        <div ref={ref}>
          <Menu.Dropdown
            onMouseLeave={startMenuCloseTimer}
            onMouseOver={stopMenuCloseTimer}
            style={{ marginLeft: "5px" }}>
            <ColorPicker
              iconSize={18}
              text={
                "textColor" in props.block.props &&
                typeof props.block.props.textColor === "string"
                  ? {
                      color: props.block.props.textColor,
                      setColor: (color) =>
                        props.editor.updateBlock(props.block, {
                          props: { textColor: color },
                        } as PartialBlock<BSchema, any, any>),
                    }
                  : undefined
              }
              background={
                "backgroundColor" in props.block.props &&
                typeof props.block.props.backgroundColor === "string"
                  ? {
                      color: props.block.props.backgroundColor,
                      setColor: (color) =>
                        props.editor.updateBlock(props.block, {
                          props: { backgroundColor: color },
                        } as PartialBlock<BSchema, any, any>),
                    }
                  : undefined
              }
            />
          </Menu.Dropdown>
        </div>
      </Menu>
    </DragHandleMenuItem>
  );
};
