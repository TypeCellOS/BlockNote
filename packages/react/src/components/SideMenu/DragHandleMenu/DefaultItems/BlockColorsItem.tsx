import { blockHasType } from "@blocknote/core";
import { SideMenuExtension } from "@blocknote/core/extensions";
import { ReactNode } from "react";

import { useComponentsContext } from "../../../../editor/ComponentsContext.js";
import { usePortalElement } from "../../../../editor/PortalElementOverride.js";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor.js";
import { useEditorDirection } from "../../../../hooks/useEditorDirection.js";
import { useExtensionState } from "../../../../hooks/useExtension.js";
import { ColorPicker } from "../../../ColorPicker/ColorPicker.js";

export const BlockColorsItem = (props: { children: ReactNode }) => {
  const Components = useComponentsContext()!;
  const portalElement = usePortalElement();
  const direction = useEditorDirection();

  const editor = useBlockNoteEditor<any, any, any>();

  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => (state ? editor.getBlock(state.blockId) : undefined),
  });
  if (!block) {
    return null;
  }
  const hasTextColor = blockHasType(block, editor, block.type, {
    textColor: "string",
  });
  const hasBackgroundColor = blockHasType(block, editor, block.type, {
    backgroundColor: "string",
  });
  if (!hasTextColor && !hasBackgroundColor) {
    return null;
  }

  const blockId = block.id;
  function setBlockColor(prop: "textColor" | "backgroundColor", color: string) {
    const block = editor.getBlock(blockId);
    if (
      block &&
      blockHasType(block, editor, block.type, { [prop]: "string" })
    ) {
      editor.updateBlock(blockId, { props: { [prop]: color } });
    }
  }

  return (
    <Components.Generic.Menu.Root
      position={direction === "rtl" ? "left" : "right"}
      sub={true}
      portalElement={portalElement}
    >
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
            hasTextColor
              ? {
                  color: block.props.textColor,
                  setColor: (color) => setBlockColor("textColor", color),
                }
              : undefined
          }
          background={
            hasBackgroundColor
              ? {
                  color: block.props.backgroundColor,
                  setColor: (color) => setBlockColor("backgroundColor", color),
                }
              : undefined
          }
        />
      </Components.Generic.Menu.Dropdown>
    </Components.Generic.Menu.Root>
  );
};
