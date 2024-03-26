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
import { ReactNode } from "react";

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

  if (
    !checkBlockTypeHasDefaultProp("textColor", props.block.type, editor) &&
    !checkBlockTypeHasDefaultProp("backgroundColor", props.block.type, editor)
  ) {
    return null;
  }

  return (
    <components.Menu sub={true} position={"right"}>
      <components.MenuTrigger sub={true}>
        <components.MenuItem subTrigger={true} expandArrow={true}>
          {props.children}
        </components.MenuItem>
      </components.MenuTrigger>

      <components.MenuDropdown sub={true} position={"right"}>
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
