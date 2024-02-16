import {
  BlockSchema,
  checkImageInSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { RiText } from "react-icons/ri";

import { useBlockNoteEditor } from "../../../editor/BlockNoteContext";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks";
import { ToolbarButton } from "../../../components-shared/Toolbar/ToolbarButton";
import { ToolbarInputDropdown } from "../../../components-shared/Toolbar/ToolbarInputDropdown";
import { ToolbarInputDropdownButton } from "../../../components-shared/Toolbar/ToolbarInputDropdownButton";
import { ToolbarInputDropdownItem } from "../../../components-shared/Toolbar/ToolbarInputDropdownItem";
import { checkBlockIsImage } from "./ReplaceImageButton";

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

    if (checkBlockIsImage(block, editor)) {
      return block;
    }

    return undefined;
  }, [editor, selectedBlocks]);

  const [currentCaption, setCurrentCaption] = useState<string>(
    imageBlock ? imageBlock.props.caption : ""
  );

  useEffect(
    () => setCurrentCaption(imageBlock ? imageBlock.props.caption : ""),
    [selectedBlocks, imageBlock]
  );

  const handleEnter = useCallback(
    (event: KeyboardEvent) => {
      if (imageBlock && checkImageInSchema(editor) && event.key === "Enter") {
        event.preventDefault();
        editor.updateBlock(imageBlock, {
          type: "image",
          props: {
            caption: currentCaption,
          },
        });
      }
    },
    [currentCaption, editor, imageBlock]
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      setCurrentCaption(event.currentTarget.value),
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
              autoFocus: true,
              placeholder: "Edit Caption",
              value: currentCaption,
              onKeyDown: handleEnter,
              onChange: handleChange,
            }}
          />
        </ToolbarInputDropdown>
      }
    />
  );
};
