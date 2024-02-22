import {
  BlockSchema,
  checkBlockIsDefaultType,
  checkDefaultBlockTypeInSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useMemo,
  useState,
} from "react";
import { RiText } from "react-icons/ri";

import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor";
import { useSelectedBlocks } from "../../../../hooks/useSelectedBlocks";
import { ToolbarButton } from "../../../mantine-shared/Toolbar/ToolbarButton";
import { ToolbarInputDropdown } from "../../../mantine-shared/Toolbar/ToolbarInputDropdown";
import { ToolbarInputDropdownButton } from "../../../mantine-shared/Toolbar/ToolbarInputDropdownButton";
import { ToolbarInputDropdownItem } from "../../../mantine-shared/Toolbar/ToolbarInputDropdownItem";

export const ImageCaptionButton = () => {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const [currentEditingCaption, setCurrentEditingCaption] = useState<string>();

  const selectedBlocks = useSelectedBlocks(editor);

  const imageBlock = useMemo(() => {
    // Checks if only one block is selected.
    if (selectedBlocks.length !== 1) {
      return undefined;
    }

    const block = selectedBlocks[0];

    if (checkBlockIsDefaultType("image", block, editor)) {
      return block;
    }

    return undefined;
  }, [editor, selectedBlocks]);

  const handleEnter = useCallback(
    (event: KeyboardEvent) => {
      if (
        imageBlock &&
        checkDefaultBlockTypeInSchema("image", editor) &&
        event.key === "Enter"
      ) {
        event.preventDefault();
        editor.updateBlock(imageBlock, {
          type: "image",
          props: {
            caption: currentEditingCaption,
          },
        });
      }
    },
    [currentEditingCaption, editor, imageBlock]
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      setCurrentEditingCaption(event.currentTarget.value),
    []
  );

  if (!imageBlock) {
    return null;
  }

  return (
    <ToolbarInputDropdownButton
      target={
        <ToolbarButton
          mainTooltip={"Edit Caption"}
          icon={RiText}
          isSelected={imageBlock.props.caption !== ""}
        />
      }
      dropdown={
        <ToolbarInputDropdown>
          <ToolbarInputDropdownItem
            type={"text"}
            icon={RiText}
            inputProps={{
              // TODO: weird pattern of props passing?
              value: currentEditingCaption,
              autoFocus: true,
              placeholder: "Edit Caption",
              onKeyDown: handleEnter,
              defaultValue: imageBlock.props.caption,
              onChange: handleChange,
            }}
          />
        </ToolbarInputDropdown>
      }
    />
  );
};
