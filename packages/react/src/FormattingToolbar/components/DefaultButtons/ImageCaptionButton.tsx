import {
  Block,
  BlockNoteEditor,
  BlockSchema,
  PartialBlock,
} from "@blocknote/core";
import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ToolbarButton } from "../../../SharedComponents/Toolbar/components/ToolbarButton";
import { RiText } from "react-icons/ri";
import { useEditorContentChange } from "../../../hooks/useEditorContentChange";
import { useEditorSelectionChange } from "../../../hooks/useEditorSelectionChange";
import { ToolbarInputDropdownButton } from "../../../SharedComponents/Toolbar/components/ToolbarInputDropdownButton";
import { ToolbarInputDropdown } from "../../../SharedComponents/Toolbar/components/ToolbarInputDropdown";
import { ToolbarInputDropdownItem } from "../../../SharedComponents/Toolbar/components/ToolbarInputDropdownItem";

export const ImageCaptionButton = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const [selectedBlocks, setSelectedBlocks] = useState<Block<BSchema>[]>(
    props.editor.getSelection()?.blocks || [
      props.editor.getTextCursorPosition().block,
    ]
  );

  useEditorContentChange(props.editor, () =>
    setSelectedBlocks(
      props.editor.getSelection()?.blocks || [
        props.editor.getTextCursorPosition().block,
      ]
    )
  );
  useEditorSelectionChange(props.editor, () =>
    setSelectedBlocks(
      props.editor.getSelection()?.blocks || [
        props.editor.getTextCursorPosition().block,
      ]
    )
  );

  const show = useMemo(
    () =>
      // Checks if only one block is selected.
      selectedBlocks.length === 1 &&
      // Checks if the selected block is an image.
      selectedBlocks[0].type === "image" &&
      // Checks if the block has a `caption` prop which can take any string
      // value.
      "caption" in props.editor.schema["image"].propSchema &&
      props.editor.schema["image"].propSchema.caption.values === undefined &&
      // Checks if the block has a `src` prop which can take any string value.
      "src" in props.editor.schema["image"].propSchema &&
      props.editor.schema["image"].propSchema.src.values === undefined &&
      // Checks if the `src` prop is not set to an empty string.
      selectedBlocks[0].props.src !== "" &&
      // Checks if the image has a `replacing` prop which can take either "true"
      // or "false".
      "replacing" in props.editor.schema["image"].propSchema &&
      props.editor.schema["image"].propSchema.replacing.values?.includes(
        "true"
      ) &&
      props.editor.schema["image"].propSchema.replacing.values?.includes(
        "false"
      ) &&
      props.editor.schema["image"].propSchema.replacing.values?.length === 2 &&
      // Checks if the `replacing` prop is set to "false".
      selectedBlocks[0].props.replacing === "false",
    [props.editor.schema, selectedBlocks]
  );

  const [currentCaption, setCurrentCaption] = useState<string>(
    show ? selectedBlocks[0].props.caption : ""
  );

  useEffect(
    () => setCurrentCaption(show ? selectedBlocks[0].props.caption : ""),
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
        } as PartialBlock<BSchema>);
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
          icon={RiText}
          mainTooltip={"Edit Caption"}
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
