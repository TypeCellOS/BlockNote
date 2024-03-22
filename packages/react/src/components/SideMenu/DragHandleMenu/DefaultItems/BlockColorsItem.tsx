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
import { ReactNode, useCallback, useRef, useState } from "react";

import { useComponentsContext } from "../../../../editor/ComponentsContext";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor";
import { ColorPicker } from "../../../ColorPicker/ColorPicker";
import { DragHandleMenuProps } from "../DragHandleMenuProps";

export const BlockColorsItem = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: DragHandleMenuProps<BSchema, I, S> & {
    children: ReactNode;
  }
) => {
  const components = useComponentsContext()!;
  const editor = useBlockNoteEditor<BSchema, I, S>();

  const [opened, setOpened] = useState(false);

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

    setOpened(true);
  }, []);

  if (
    !checkBlockTypeHasDefaultProp("textColor", props.block.type, editor) &&
    !checkBlockTypeHasDefaultProp("backgroundColor", props.block.type, editor)
  ) {
    return null;
  }

  return (
    <components.Menu open={opened} position={"right"}>
      <components.MenuTrigger>
        <components.MenuItem
          onMouseLeave={startMenuCloseTimer}
          onMouseOver={stopMenuCloseTimer}
          expandArrow={true}>
          {props.children}
        </components.MenuItem>
      </components.MenuTrigger>

      <components.MenuDropdown
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
      </components.MenuDropdown>
    </components.Menu>
  );
};
