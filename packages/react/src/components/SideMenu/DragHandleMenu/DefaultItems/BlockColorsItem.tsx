import {
  Block,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  defaultZodPropSchema,
  editorHasBlockTypeAndZodProps,
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

  const block = props.block as Block<any, any, any>;

  if (
    !editorHasBlockTypeAndZodProps(
      editor,
      block.type,
      defaultZodPropSchema.pick({ textColor: true }),
    ) &&
    !editorHasBlockTypeAndZodProps(
      editor,
      block.type,
      defaultZodPropSchema.pick({ backgroundColor: true }),
    )
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
            editorHasBlockTypeAndZodProps(
              editor,
              block.type,
              defaultZodPropSchema.pick({ textColor: true }),
            )
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
            editorHasBlockTypeAndZodProps(
              editor,
              block.type,
              defaultZodPropSchema.pick({ backgroundColor: true }),
            )
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
