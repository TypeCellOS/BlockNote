import {
  Block,
  blockHasType,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  editorHasBlockWithType,
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

  // We cast the block to a generic one, as the base type causes type errors
  // with runtime type checking using `blockHasType`. Runtime type checking is
  // more valuable than static checks, so better to do it like this.
  const block = props.block as Block<any, any, any>;

  if (
    !blockHasType(block, editor, block.type, {
      textColor: "string",
    }) &&
    !blockHasType(block, editor, block.type, {
      backgroundColor: "string",
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
            blockHasType(block, editor, block.type, {
              textColor: "string",
            }) &&
            editorHasBlockWithType(editor, block.type, {
              textColor: "string",
            })
              ? {
                  color: block.props.textColor,
                  setColor: (color) =>
                    editor.updateBlock(block, {
                      type: block.type,
                      props: { textColor: color },
                    }),
                }
              : undefined
          }
          background={
            blockHasType(block, editor, block.type, {
              backgroundColor: "string",
            }) &&
            editorHasBlockWithType(editor, block.type, {
              backgroundColor: "string",
            })
              ? {
                  color: block.props.backgroundColor,
                  setColor: (color) =>
                    editor.updateBlock(block, {
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
