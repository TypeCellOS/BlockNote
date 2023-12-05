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

import { ToolbarButton } from "../../../components-shared/Toolbar/ToolbarButton";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks";

type TextAlignment = DefaultProps["textAlignment"];

const icons: Record<TextAlignment, IconType> = {
  left: RiAlignLeft,
  center: RiAlignCenter,
  right: RiAlignRight,
  justify: RiAlignJustify,
};

export const TextAlignButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema, any, any>;
  textAlignment: TextAlignment;
}) => {
  const selectedBlocks = useSelectedBlocks(props.editor);

  const textAlignment = useMemo(() => {
    const block = selectedBlocks[0];

    if ("textAlignment" in block.props) {
      return block.props.textAlignment as TextAlignment;
    }

    return;
  }, [selectedBlocks]);

  const setTextAlignment = useCallback(
    (textAlignment: TextAlignment) => {
      props.editor.focus();

      for (const block of selectedBlocks) {
        props.editor.updateBlock(block, {
          props: { textAlignment: textAlignment },
        } as PartialBlock<BSchema, any, any>);
      }
    },
    [props.editor, selectedBlocks]
  );

  const show = useMemo(() => {
    return !!selectedBlocks.find((block) => "textAlignment" in block.props);
  }, [selectedBlocks]);

  if (!show) {
    return null;
  }

  return (
    <ToolbarButton
      onClick={() => setTextAlignment(props.textAlignment)}
      isSelected={textAlignment === props.textAlignment}
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
