import {
  Block,
  BlockNoteEditor,
  BlockSchema,
  PartialBlock,
} from "@blocknote/core";
import { ToolbarButton } from "../../../SharedComponents/Toolbar/components/ToolbarButton";
import { useEditorContentChange } from "../../../hooks/useEditorContentChange";
import { useEditorSelectionChange } from "../../../hooks/useEditorSelectionChange";
import { useMemo, useState } from "react";
import { RiImageEditFill } from "react-icons/ri";

export const ReplaceImageButton = <BSchema extends BlockSchema>(props: {
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

    // Checks if the selected block is an image.
    if (selectedBlocks[0].type === "image") {
      // Checks if the image has a src prop which can take any string value.
      if (
        !("src" in props.editor.schema["image"].propSchema) ||
        props.editor.schema["image"].propSchema.src.values !== undefined
      ) {
        return false;
      }

      // Checks if the image has a replacing prop which can take either "true"
      // or "false".
      if (
        !("replacing" in props.editor.schema["image"].propSchema) ||
        !props.editor.schema["image"].propSchema.replacing.values?.includes(
          "true"
        ) ||
        !props.editor.schema["image"].propSchema.replacing.values?.includes(
          "false"
        ) ||
        props.editor.schema["image"].propSchema.replacing.values?.length !== 2
      ) {
        return false;
      }

      return true;
    }

    // Checks if the selected block is a captionedImage.
    if (selectedBlocks[0].type === "captionedImage") {
      // Checks if the image has a src prop which can take any string value.
      if (
        !("src" in props.editor.schema["captionedImage"].propSchema) ||
        props.editor.schema["captionedImage"].propSchema.src.values !==
          undefined
      ) {
        return false;
      }

      // Checks if the image has a replacing prop which can take either "true"
      // or "false".
      if (
        !("replacing" in props.editor.schema["captionedImage"].propSchema) ||
        !props.editor.schema[
          "captionedImage"
        ].propSchema.replacing.values?.includes("true") ||
        !props.editor.schema[
          "captionedImage"
        ].propSchema.replacing.values?.includes("false") ||
        props.editor.schema["captionedImage"].propSchema.replacing.values
          ?.length !== 2
      ) {
        return false;
      }

      return true;
    }

    return false;
  }, [props.editor.schema, selectedBlocks]);

  if (!show) {
    return null;
  }

  return (
    <ToolbarButton
      onClick={() => {
        props.editor.updateBlock(selectedBlocks[0], {
          type: selectedBlocks[0].type,
          props: {
            replacing:
              selectedBlocks[0].props.replacing === "true" ? "false" : "true",
          },
        } as PartialBlock<BSchema>);
        props.editor.focus();
      }}
      isSelected={selectedBlocks[0].props.replacing === "true"}
      mainTooltip={"Replace Image"}
      icon={RiImageEditFill}
    />
  );
};
