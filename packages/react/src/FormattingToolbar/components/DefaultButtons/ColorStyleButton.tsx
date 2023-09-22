import { useCallback, useState } from "react";
import { Menu } from "@mantine/core";
import { BlockNoteEditor, BlockSchema } from "@blocknote/core";
import { ToolbarButton } from "../../../SharedComponents/Toolbar/components/ToolbarButton";
import { ColorIcon } from "../../../SharedComponents/ColorPicker/components/ColorIcon";
import { ColorPicker } from "../../../SharedComponents/ColorPicker/components/ColorPicker";
import { useEditorContentChange } from "../../../hooks/useEditorContentChange";
import { useEditorSelectionChange } from "../../../hooks/useEditorSelectionChange";
import { usePreventMenuOverflow } from "../../../hooks/usePreventMenuOverflow";

export const ColorStyleButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const [currentTextColor, setCurrentTextColor] = useState<string>(
    props.editor.getActiveStyles().textColor || "default"
  );
  const [currentBackgroundColor, setCurrentBackgroundColor] = useState<string>(
    props.editor.getActiveStyles().backgroundColor || "default"
  );

  useEditorContentChange(props.editor, () => {
    setCurrentTextColor(props.editor.getActiveStyles().textColor || "default");
    setCurrentBackgroundColor(
      props.editor.getActiveStyles().backgroundColor || "default"
    );
  });

  useEditorSelectionChange(props.editor, () => {
    setCurrentTextColor(props.editor.getActiveStyles().textColor || "default");
    setCurrentBackgroundColor(
      props.editor.getActiveStyles().backgroundColor || "default"
    );
  });

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

  const { ref, updateMaxHeight } = usePreventMenuOverflow();

  return (
    <Menu onOpen={updateMaxHeight}>
      <Menu.Target>
        <ToolbarButton
          mainTooltip={"Colors"}
          icon={() => (
            <ColorIcon
              textColor={currentTextColor}
              backgroundColor={currentBackgroundColor}
              size={20}
            />
          )}
        />
      </Menu.Target>
      <div ref={ref}>
        <Menu.Dropdown>
          <ColorPicker
            textColor={currentTextColor}
            setTextColor={setTextColor}
            backgroundColor={currentBackgroundColor}
            setBackgroundColor={setBackgroundColor}
          />
        </Menu.Dropdown>
      </div>
    </Menu>
  );
};
