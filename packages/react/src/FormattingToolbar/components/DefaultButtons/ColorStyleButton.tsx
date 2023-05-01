import { useCallback } from "react";
import { Menu } from "@mantine/core";
import { BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { ToolbarButton } from "../../../SharedComponents/Toolbar/components/ToolbarButton";
import { ColorIcon } from "../../../SharedComponents/ColorPicker/components/ColorIcon";
import { ColorPicker } from "../../../SharedComponents/ColorPicker/components/ColorPicker";

export const ColorStyleButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const getTextColor = useCallback(
    () => props.editor.getActiveStyles().textColor || "default",
    [props]
  );

  const setTextColor = useCallback(
    (color: string) => {
      props.editor.focus();
      color === "default"
        ? props.editor.removeStyles({ textColor: color })
        : props.editor.addStyles({ textColor: color });
    },
    [props]
  );

  const getBackgroundColor = useCallback(
    () => props.editor.getActiveStyles().backgroundColor || "default",
    [props]
  );

  const setBackgroundColor = useCallback(
    (color: string) => {
      props.editor.focus();
      color === "default"
        ? props.editor.removeStyles({ backgroundColor: color })
        : props.editor.addStyles({ backgroundColor: color });
    },
    [props]
  );

  return (
    <Menu>
      <Menu.Target>
        <ToolbarButton
          mainTooltip={"Colors"}
          icon={() => (
            <ColorIcon
              textColor={getTextColor()}
              backgroundColor={getBackgroundColor()}
              size={20}
            />
          )}
        />
      </Menu.Target>
      <Menu.Dropdown>
        <ColorPicker
          textColor={getTextColor()}
          setTextColor={setTextColor}
          backgroundColor={getBackgroundColor()}
          setBackgroundColor={setBackgroundColor}
        />
      </Menu.Dropdown>
    </Menu>
  );
};
