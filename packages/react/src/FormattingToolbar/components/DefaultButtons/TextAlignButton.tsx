import { BlockNoteEditor, DefaultBlockPropsType } from "@blocknote/core";
import { useCallback } from "react";
import { IconType } from "react-icons";
import {
  RiAlignCenter,
  RiAlignJustify,
  RiAlignLeft,
  RiAlignRight,
} from "react-icons/ri";
import { ToolbarButton } from "../../../SharedComponents/Toolbar/components/ToolbarButton";

const icons: Record<DefaultBlockPropsType["textAlignment"], IconType> = {
  left: RiAlignLeft,
  center: RiAlignCenter,
  right: RiAlignRight,
  justify: RiAlignJustify,
};

export const TextAlignButton = (props: {
  editor: BlockNoteEditor;
  textAlignment: DefaultBlockPropsType["textAlignment"];
}) => {
  const getTextAlignment = useCallback(
    () => props.editor.getTextCursorPosition().block.props.textAlignment,
    [props]
  );

  const setTextAlignment = useCallback(
    (textAlignment: DefaultBlockPropsType["textAlignment"]) => {
      props.editor.focus();
      for (const block of props.editor.getSelection().blocks) {
        props.editor.updateBlock(block, {
          props: { textAlignment: textAlignment },
        });
      }
    },
    [props]
  );

  return (
    <ToolbarButton
      onClick={() => setTextAlignment(props.textAlignment)}
      isSelected={getTextAlignment() === props.textAlignment}
      mainTooltip={
        props.textAlignment === "justify"
          ? "Justify Text"
          : "Align Text " +
            props.textAlignment.slice(0, 1).toUpperCase() +
            props.textAlignment.slice(1)
      }
      icon={icons[props.textAlignment]}
    />
  );
};
