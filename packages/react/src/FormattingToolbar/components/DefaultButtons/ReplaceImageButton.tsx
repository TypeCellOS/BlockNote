import { useMemo } from "react";
import { BlockNoteEditor, BlockSchema, PartialBlock } from "@blocknote/core";
import { RiImageEditFill } from "react-icons/ri";

import { ToolbarButton } from "../../../SharedComponents/Toolbar/components/ToolbarButton";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks";

export const ReplaceImageButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const selectedBlocks = useSelectedBlocks(props.editor);

  const show = useMemo(
    () =>
      // Checks if only one block is selected.
      selectedBlocks.length === 1 &&
      // Checks if the selected block is an image.
      selectedBlocks[0].type === "image" &&
      // Checks if the image has a `replacing` prop which can take either "true"
      // or "false".
      "replacing" in props.editor.schema["image"].propSchema &&
      props.editor.schema["image"].propSchema.replacing.values?.includes(
        "true"
      ) &&
      props.editor.schema["image"].propSchema.replacing.values?.includes(
        "false"
      ) &&
      props.editor.schema["image"].propSchema.replacing.values?.length === 2,
    [props.editor.schema, selectedBlocks]
  );

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
