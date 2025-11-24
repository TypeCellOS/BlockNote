import { blockHasType, editorHasBlockWithType } from "@blocknote/core";
import { SideMenuExtension } from "@blocknote/core/extensions";
import { ReactNode } from "react";

import { useComponentsContext } from "../../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor.js";
import { ColorPicker } from "../../../ColorPicker/ColorPicker.js";
import { useExtensionState } from "../../../../hooks/useExtension.js";

export const BlockColorsItem = (props: { children: ReactNode }) => {
  const Components = useComponentsContext()!;

  const editor = useBlockNoteEditor<any, any, any>();

  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => state?.block,
  });

  if (
    block === undefined ||
    (!blockHasType(block, editor, block.type, {
      textColor: "string",
    }) &&
      !blockHasType(block, editor, block.type, {
        backgroundColor: "string",
      }))
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
