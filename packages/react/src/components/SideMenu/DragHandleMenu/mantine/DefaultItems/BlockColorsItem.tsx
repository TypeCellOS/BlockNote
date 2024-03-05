import {
  BlockSchema,
  checkBlockHasDefaultProp,
  checkBlockTypeHasDefaultProp,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { Box, Menu } from "@mantine/core";
import { ReactNode, useCallback, useRef, useState } from "react";
import { HiChevronRight } from "react-icons/hi";

import { useBlockNoteEditor } from "../../../../../hooks/useBlockNoteEditor";
import { usePreventMenuOverflow } from "../../../../../hooks/usePreventMenuOverflow";
import { ColorPicker } from "../../../../mantine-shared/ColorPicker/ColorPicker";
import { DragHandleMenuProps } from "../../DragHandleMenuProps";
import { DragHandleMenuItem } from "../DragHandleMenuItem";

export const BlockColorsItem = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: DragHandleMenuProps<BSchema, I, S> & {
    children: ReactNode;
  }
) => {
  const editor = useBlockNoteEditor<BSchema, I, S>();

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
    !checkBlockTypeHasDefaultProp("textColor", props.block.type, editor) &&
    !checkBlockTypeHasDefaultProp("backgroundColor", props.block.type, editor)
  ) {
    return null;
  }

  return (
    <DragHandleMenuItem
      onMouseLeave={startMenuCloseTimer}
      onMouseOver={stopMenuCloseTimer}>
      <Menu withinPortal={false} opened={opened} position={"right"}>
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
                checkBlockTypeHasDefaultProp(
                  "textColor",
                  props.block.type,
                  editor
                ) && checkBlockHasDefaultProp("textColor", props.block, editor)
                  ? {
                      color: props.block.props.textColor,
                      setColor: (color) =>
                        editor.updateBlock(props.block, {
                          type: props.block.type,
                          props: { textColor: color },
                        }),
                    }
                  : undefined
              }
              background={
                checkBlockTypeHasDefaultProp(
                  "backgroundColor",
                  props.block.type,
                  editor
                ) &&
                checkBlockHasDefaultProp("backgroundColor", props.block, editor)
                  ? {
                      color: props.block.props.backgroundColor,
                      setColor: (color) =>
                        editor.updateBlock(props.block, {
                          props: { backgroundColor: color },
                        }),
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
