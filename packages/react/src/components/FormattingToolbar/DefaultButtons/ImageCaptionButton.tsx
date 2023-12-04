import { BlockNoteEditor, BlockSchema, PartialBlock } from "@blocknote/core";
import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { RiText } from "react-icons/ri";

import { ToolbarButton } from "../../../components-shared/Toolbar/ToolbarButton";
import { ToolbarInputDropdown } from "../../../components-shared/Toolbar/ToolbarInputDropdown";
import { ToolbarInputDropdownButton } from "../../../components-shared/Toolbar/ToolbarInputDropdownButton";
import { ToolbarInputDropdownItem } from "../../../components-shared/Toolbar/ToolbarInputDropdownItem";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks";

export const ImageCaptionButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema, any, any>;
}) => {
  const selectedBlocks = useSelectedBlocks(props.editor);

  const show = useMemo(
    () =>
      // Checks if only one block is selected.
      selectedBlocks.length === 1 &&
      // Checks if the selected block is an image.
      selectedBlocks[0].type === "image" &&
      // Checks if the block has a `caption` prop which can take any string
      // value.
      "caption" in props.editor.blockSchema["image"].propSchema &&
      typeof props.editor.blockSchema["image"].propSchema.caption.default ===
        "string" &&
      props.editor.blockSchema["image"].propSchema.caption.values ===
        undefined &&
      // Checks if the block has a `url` prop which can take any string value.
      "url" in props.editor.blockSchema["image"].propSchema &&
      typeof props.editor.blockSchema["image"].propSchema.url.default ===
        "string" &&
      props.editor.blockSchema["image"].propSchema.url.values === undefined &&
      // Checks if the `url` prop is not set to an empty string.
      selectedBlocks[0].props.url !== "",
    [props.editor.blockSchema, selectedBlocks]
  );

  const [currentCaption, setCurrentCaption] = useState<string>(
    show ? (selectedBlocks[0].props.caption as string) : ""
  );

  useEffect(
    () =>
      setCurrentCaption(
        show ? (selectedBlocks[0].props.caption as string) : ""
      ),
    [selectedBlocks, show]
  );

  const handleEnter = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        props.editor.updateBlock(selectedBlocks[0], {
          type: "image",
          props: {
            caption: currentCaption,
          },
        } as PartialBlock<BSchema, any, any>);
      }
    },
    [currentCaption, props.editor, selectedBlocks]
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      setCurrentCaption(event.currentTarget.value),
    []
  );

  if (!show) {
    return null;
  }

  return (
    <ToolbarInputDropdownButton>
      <ToolbarButton
        mainTooltip={"Edit Caption"}
        icon={RiText}
        isSelected={selectedBlocks[0].props.caption !== ""}
      />
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
    </ToolbarInputDropdownButton>
  );
};
