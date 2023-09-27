import { useCallback, useMemo, useState } from "react";
import { Menu } from "@mantine/core";
import { BlockNoteEditor, BlockSchema } from "@blocknote/core";

import { ToolbarButton } from "../../../SharedComponents/Toolbar/components/ToolbarButton";
import { ColorIcon } from "../../../SharedComponents/ColorPicker/components/ColorIcon";
import { ColorPicker } from "../../../SharedComponents/ColorPicker/components/ColorPicker";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks";
import { useEditorChange } from "../../../hooks/useEditorChange";
import { usePreventMenuOverflow } from "../../../hooks/usePreventMenuOverflow";

export const ColorStyleButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const selectedBlocks = useSelectedBlocks(props.editor);

  const [currentTextColor, setCurrentTextColor] = useState<string>(
    props.editor.getActiveStyles().textColor || "default"
  );
  const [currentBackgroundColor, setCurrentBackgroundColor] = useState<string>(
    props.editor.getActiveStyles().backgroundColor || "default"
  );

  useEditorChange(props.editor, () => {
    setCurrentTextColor(props.editor.getActiveStyles().textColor || "default");
    setCurrentBackgroundColor(
      props.editor.getActiveStyles().backgroundColor || "default"
    );
  });

  const { ref, updateMaxHeight } = usePreventMenuOverflow();

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

  const show = useMemo(() => {
    for (const block of selectedBlocks) {
      if (block.content !== undefined) {
        return true;
      }
    }

    return false;
  }, [selectedBlocks]);

  if (!show) {
    return null;
  }

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
            text={{
              color: currentTextColor,
              setColor: setTextColor,
            }}
            background={{
              color: currentBackgroundColor,
              setColor: setBackgroundColor,
            }}
          />
        </Menu.Dropdown>
      </div>
    </Menu>
  );
};
