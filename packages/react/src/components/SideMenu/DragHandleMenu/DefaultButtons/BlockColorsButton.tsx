import {
  Block,
  BlockFromConfig,
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  PropSchema,
  StyleSchema,
} from "@blocknote/core";
import { Box, Menu } from "@mantine/core";
import { ReactNode, useCallback, useRef, useState } from "react";
import { HiChevronRight } from "react-icons/hi";

import { useBlockNoteEditor } from "../../../../editor/BlockNoteContext";
import { usePreventMenuOverflow } from "../../../../hooks/usePreventMenuOverflow";
import { ColorPicker } from "../../../../components-shared/ColorPicker/ColorPicker";
import type { DragHandleMenuProps } from "../DragHandleMenu";
import { DragHandleMenuItem } from "../DragHandleMenuItem";

type BlockConfigWithColor<
  Color extends "text" | "background",
  T extends string = string,
  PS extends PropSchema = PropSchema,
  C extends "inline" | "table" | "none" = "inline" | "table" | "none"
> = {
  type: T;
  propSchema: PS & Color extends "text"
    ? {
        textColor: {
          default: string;
        };
      }
    : {
        backgroundColor: {
          default: string;
        };
      };
  content: C;
};

function checkBlockTypeHasColor<
  Color extends "text" | "background",
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(color: Color, blockType: string, editor: BlockNoteEditor<BSchema, I, S>) {
  return (
    // Block type has color prop
    blockType in editor.blockSchema &&
    `${color}Color` in editor.blockSchema[blockType].propSchema &&
    // Default textAlignment value is valid
    !("values" in editor.blockSchema[blockType].propSchema[`${color}Color`])
  );
}

function checkBlockHasColor<
  Color extends "text" | "background",
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  color: Color,
  block: Block<BSchema, I, S>,
  editor: BlockNoteEditor<BSchema, I, S>
): block is BlockFromConfig<BlockConfigWithColor<Color>, I, S> {
  return checkBlockTypeHasColor(color, block.type, editor);
}

function checkBlockCanHaveColor<
  Color extends "text" | "background",
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  color: Color,
  block: Block<BSchema, I, S>,
  editor: BlockNoteEditor<any, I, S>
): editor is BlockNoteEditor<
  {
    [k in string]: BlockConfigWithColor<
      Color,
      BSchema[k]["type"],
      BSchema[k]["propSchema"],
      BSchema[k]["content"]
    >;
  },
  I,
  S
> {
  return checkBlockTypeHasColor(color, block.type, editor);
}

export const BlockColorsButton = <
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
    !checkBlockCanHaveColor("text", props.block, editor) &&
    !checkBlockCanHaveColor("background", props.block, editor)
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
                checkBlockHasColor("text", props.block, editor) &&
                checkBlockCanHaveColor("text", props.block, editor)
                  ? {
                      color: props.block.props.textColor,
                      setColor: (color) =>
                        editor.updateBlock(props.block, {
                          props: { textColor: color },
                        }),
                    }
                  : undefined
              }
              background={
                checkBlockHasColor("background", props.block, editor) &&
                checkBlockCanHaveColor("background", props.block, editor)
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
