import {
  BlockSchema,
  checkBlockIsDefaultType,
  checkDefaultBlockTypeInSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { KeyboardEvent, useCallback, useMemo, useRef } from "react";
import { RiText } from "react-icons/ri";

import { useBlockNoteEditor } from "../../../editor/BlockNoteContext";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks";
import { ToolbarButton } from "../../../components-shared/Toolbar/ToolbarButton";
import { ToolbarInputDropdown } from "../../../components-shared/Toolbar/ToolbarInputDropdown";
import { ToolbarInputDropdownButton } from "../../../components-shared/Toolbar/ToolbarInputDropdownButton";
import { ToolbarInputDropdownItem } from "../../../components-shared/Toolbar/ToolbarInputDropdownItem";

export const ImageCaptionButton = () => {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

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

  const ref = useRef<HTMLInputElement>(null);

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
            caption: ref.current!.value,
          },
        });
      }
    },
    [editor, imageBlock]
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
              autoFocus: true,
              placeholder: "Edit Caption",
              onKeyDown: handleEnter,
              defaultValue: imageBlock.props.caption,
            }}
            ref={ref}
          />
        </ToolbarInputDropdown>
      }
    />
  );
};
