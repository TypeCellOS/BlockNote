import { useCallback } from "react";
import { Menu } from "@mantine/core";
import { BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { ToolbarButton } from "../../../SharedComponents/Toolbar/components/ToolbarButton";
import { ColorIcon } from "../../../SharedComponents/ColorPicker/components/ColorIcon";
import { ColorPicker } from "../../../SharedComponents/ColorPicker/components/ColorPicker";

export const ColorStyleButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const setTextColor = useCallback(
    (color: string) => {
      props.editor.focus();
      color === "default"
        ? props.editor.removeStyles({ textColor: color })
        : props.editor.addStyles({ textColor: color });
    },
    [props.editor]
  );

  const setBackgroundColor = useCallback(
    (color: string) => {
      props.editor.focus();
      color === "default"
        ? props.editor.removeStyles({ backgroundColor: color })
        : props.editor.addStyles({ backgroundColor: color });
    },
    [props.editor]
  );

  return (
    <Menu>
      <Menu.Target>
        <ToolbarButton
          mainTooltip={"Colors"}
          icon={() => (
            <ColorIcon
              textColor={props.editor.getActiveStyles().textColor || "default"}
              backgroundColor={
                props.editor.getActiveStyles().backgroundColor || "default"
              }
              size={20}
            />
          )}
        />
      </Menu.Target>
      <Menu.Dropdown>
        <ColorPicker
          textColor={props.editor.getActiveStyles().textColor || "default"}
          setTextColor={setTextColor}
          backgroundColor={
            props.editor.getActiveStyles().backgroundColor || "default"
          }
          setBackgroundColor={setBackgroundColor}
        />
      </Menu.Dropdown>
    </Menu>
  );
};
