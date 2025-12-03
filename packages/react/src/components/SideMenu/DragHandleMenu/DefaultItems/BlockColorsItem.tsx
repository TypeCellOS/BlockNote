import {
  defaultZodPropSchema,
  editorHasBlockTypeAndZodProps
} from "@blocknote/core";
import { SideMenuExtension } from "@blocknote/core/extensions";
import { ReactNode } from "react";

import { useComponentsContext } from "../../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor.js";
import { useExtensionState } from "../../../../hooks/useExtension.js";
import { ColorPicker } from "../../../ColorPicker/ColorPicker.js";

export const BlockColorsItem = (props: { children: ReactNode }) => {
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<any, any, any>();

  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => state?.block,
  });

  if (
    block === undefined ||
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
