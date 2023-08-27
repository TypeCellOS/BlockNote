import {
  Block,
  BlockNoteEditor,
  BlockSchema,
  PartialBlock,
} from "@blocknote/core";
import { useMemo, useState } from "react";
import { ToolbarButton } from "../../../SharedComponents/Toolbar/components/ToolbarButton";
import { RiText } from "react-icons/ri";
import { useEditorContentChange } from "../../../hooks/useEditorContentChange";
import { useEditorSelectionChange } from "../../../hooks/useEditorSelectionChange";

export const ToggleImageCaptionButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
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

  const show = useMemo(() => {
    if (selectedBlocks.length > 1) {
      return false;
    }

    return (
      // Checks if the schema contains an image and captioned image block.
      "image" in props.editor.schema &&
      "captionedImage" in props.editor.schema &&
      // Checks if the selected block is an image or captioned image.
      (selectedBlocks[0].type === "image" ||
        selectedBlocks[0].type === "captionedImage") &&
      // Checks if the block has a src prop which can take any string value.
      "src" in props.editor.schema["image"].propSchema &&
      props.editor.schema["image"].propSchema.src.values === undefined &&
      "src" in props.editor.schema["captionedImage"].propSchema &&
      props.editor.schema["captionedImage"].propSchema.src.values ===
        undefined &&
      // Checks if the image block doesn't contain inline content and the
      // captioned image block does.
      !props.editor.schema["image"].containsInlineContent &&
      props.editor.schema["captionedImage"].containsInlineContent
    );
  }, [props.editor.schema, selectedBlocks]);

  if (!show) {
    return null;
  }

  return (
    <ToolbarButton
      onClick={() => {
        if (selectedBlocks[0].type === "image") {
          props.editor.updateBlock(selectedBlocks[0], {
            type: "captionedImage",
            props: selectedBlocks[0].props,
          } as PartialBlock<BSchema>);
        } else {
          props.editor.updateBlock(selectedBlocks[0], {
            type: "image",
            props: selectedBlocks[0].props,
          } as PartialBlock<BSchema>);
        }
        props.editor.setTextCursorPosition(selectedBlocks[0]);
        props.editor.focus();
      }}
      isSelected={selectedBlocks[0].type === "captionedImage"}
      mainTooltip={"Add/Remove Caption"}
      icon={RiText}
    />
  );
};
