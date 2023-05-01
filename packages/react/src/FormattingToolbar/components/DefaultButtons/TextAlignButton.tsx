import {
  Block,
  BlockNoteEditor,
  BlockSchema,
  defaultProps,
  Props,
} from "@blocknote/core";
import { useCallback, useState } from "react";
import { IconType } from "react-icons";
import {
  RiAlignCenter,
  RiAlignJustify,
  RiAlignLeft,
  RiAlignRight,
} from "react-icons/ri";
import { ToolbarButton } from "../../../SharedComponents/Toolbar/components/ToolbarButton";

type TextAlignment = Props<typeof defaultProps>["textAlignment"];

const icons: Record<TextAlignment, IconType> = {
  left: RiAlignLeft,
  center: RiAlignCenter,
  right: RiAlignRight,
  justify: RiAlignJustify,
};

export const TextAlignButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
  textAlignment: TextAlignment;
}) => {
  const [show, setShow] = useState(false);

  const getTextAlignment = useCallback(() => {
    const block = props.editor.getTextCursorPosition().block;

    if ("textAlignment" in block.props) {
      !show && setShow(true);
      return block.props.textAlignment;
    } else {
      show && setShow(false);
      return "left";
    }
  }, [show, props]);

  const setTextAlignment = useCallback(
    (textAlignment: TextAlignment) => {
      props.editor.focus();

      for (const block of props.editor.getSelection().blocks) {
        if ("textAlignment" in block.props) {
          props.editor.updateBlock(block, {
            props: { textAlignment: textAlignment },
          } as unknown as Block<BSchema>);
        }
      }
    },
    [props]
  );

  if (!show) {
    return null;
  }

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
