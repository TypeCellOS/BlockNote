import {
  BlockNoteEditor,
  BlockSchema,
  DefaultProps,
  PartialBlock,
} from "@blocknote/core";
import { useCallback, useMemo } from "react";
import { IconType } from "react-icons";
import {
  RiAlignCenter,
  RiAlignJustify,
  RiAlignLeft,
  RiAlignRight,
} from "react-icons/ri";
import { ToolbarButton } from "../../../SharedComponents/Toolbar/components/ToolbarButton";

type TextAlignment = DefaultProps["textAlignment"]["values"][number];

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
  const show = useMemo(() => {
    const selection = props.editor.getSelection();

    if (selection) {
      for (const block of selection.blocks) {
        if (!("textAlignment" in block.props)) {
          return false;
        }
      }
    } else {
      const block = props.editor.getTextCursorPosition().block;

      if (!("textAlignment" in block.props)) {
        return false;
      }
    }

    return true;
  }, [props.editor]);

  const setTextAlignment = useCallback(
    (textAlignment: TextAlignment) => {
      props.editor.focus();

      const selection = props.editor.getSelection();

      if (selection) {
        for (const block of selection.blocks) {
          props.editor.updateBlock(block, {
            props: { textAlignment: textAlignment },
          } as PartialBlock<BSchema>);
        }
      } else {
        const block = props.editor.getTextCursorPosition().block;

        props.editor.updateBlock(block, {
          props: { textAlignment: textAlignment },
        } as PartialBlock<BSchema>);
      }
    },
    [props.editor]
  );

  if (!show) {
    return null;
  }

  return (
    <ToolbarButton
      onClick={() => setTextAlignment(props.textAlignment)}
      isSelected={
        props.editor.getTextCursorPosition().block.props.textAlignment ===
        props.textAlignment
      }
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
