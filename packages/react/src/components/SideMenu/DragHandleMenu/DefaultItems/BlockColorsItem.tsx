import {
  blockHasTypeAndProps,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  defaultProps,
  DefaultStyleSchema,
  editorHasBlockWithTypeAndProps,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { ReactNode } from "react";

import { useComponentsContext } from "../../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor.js";
import { ColorPicker } from "../../../ColorPicker/ColorPicker.js";
import { DragHandleMenuProps } from "../DragHandleMenuProps.js";

export const BlockColorsItem = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema,
>(
  props: DragHandleMenuProps<BSchema, I, S> & {
    children: ReactNode;
  },
) => {
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<BSchema, I, S>();

  if (
    !blockHasTypeAndProps(props.block, editor, props.block.type, {
      textColor: defaultProps.textColor,
    }) ||
    !blockHasTypeAndProps(props.block, editor, props.block.type, {
      backgroundColor: defaultProps.backgroundColor,
    })
  ) {
    return null;
  }

  return (
    <Components.Generic.Menu.Root position={"right"} sub={true}>
      <Components.Generic.Menu.Trigger sub={true}>
        <Components.Generic.Menu.Item
          className={"bn-menu-item"}
          subTrigger={true}
        >
          {props.children}
        </Components.Generic.Menu.Item>
      </Components.Generic.Menu.Trigger>

      <Components.Generic.Menu.Dropdown
        sub={true}
        className={"bn-menu-dropdown bn-color-picker-dropdown"}
      >
        <ColorPicker
          iconSize={18}
          text={
            blockHasTypeAndProps(props.block, editor, props.block.type, {
              textColor: defaultProps.textColor,
            }) &&
            editorHasBlockWithTypeAndProps(editor, props.block.type, {
              textColor: defaultProps.textColor,
            })
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
            blockHasTypeAndProps(props.block, editor, props.block.type, {
              backgroundColor: defaultProps.backgroundColor,
            }) &&
            editorHasBlockWithTypeAndProps(editor, props.block.type, {
              backgroundColor: defaultProps.backgroundColor,
            })
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
      </Components.Generic.Menu.Dropdown>
    </Components.Generic.Menu.Root>
  );
};
