import {
  Block,
  BlockNoteEditor,
  BlockSchema,
  DefaultProps,
  PartialBlock,
} from "@blocknote/core";
import { useCallback, useMemo, useState } from "react";
import { IconType } from "react-icons";
import {
  RiAlignCenter,
  RiAlignJustify,
  RiAlignLeft,
  RiAlignRight,
} from "react-icons/ri";
import { ToolbarButton } from "../../../SharedComponents/Toolbar/components/ToolbarButton";
import { useEditorContentChange } from "../../../hooks/useEditorContentChange";
import { useEditorSelectionChange } from "../../../hooks/useEditorSelectionChange";

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
  const [selectedBlocks, setSelectedBlocks] = useState<Block<BSchema>[]>(
    props.editor.getSelection()?.blocks || [
      props.editor.getTextCursorPosition().block,
    ]
  );

  useEditorContentChange(props.editor, () => {
    setSelectedBlocks(
      props.editor.getSelection()?.blocks || [
        props.editor.getTextCursorPosition().block,
      ]
    );
  });

  useEditorSelectionChange(props.editor, () => {
    setSelectedBlocks(
      props.editor.getSelection()?.blocks || [
        props.editor.getTextCursorPosition().block,
      ]
    );
  });

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
        } as PartialBlock<BSchema>);
      }
    },
    [props.editor, selectedBlocks]
  );

  const show = useMemo(() => {
    for (const block of selectedBlocks) {
      if ("textAlignment" in block.props) {
        return true;
      }
    }

    return false;
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
