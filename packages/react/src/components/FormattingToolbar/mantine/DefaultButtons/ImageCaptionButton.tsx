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

import { useComponentsContext } from "../../../../editor/ComponentsContext";
import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor";
import { useSelectedBlocks } from "../../../../hooks/useSelectedBlocks";
import { ToolbarButton } from "../../../mantine-shared/Toolbar/ToolbarButton";
import { ToolbarInputsMenuItem } from "../../../mantine-shared/Toolbar/ToolbarInputsMenuItem";

export const ImageCaptionButton = () => {
  const components = useComponentsContext()!;
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
    <components.Popover>
      <components.PopoverTrigger>
        <ToolbarButton
          mainTooltip={"Edit Caption"}
          icon={RiText}
          isSelected={imageBlock.props.caption !== ""}
        />
      </components.PopoverTrigger>
      <components.PopoverContent>
        <ToolbarInputsMenuItem
          icon={RiText}
          value={currentEditingCaption}
          autoFocus={true}
          placeholder={"Edit Caption"}
          onKeyDown={handleEnter}
          defaultValue={imageBlock.props.caption}
          onChange={handleChange}
        />
      </components.PopoverContent>
    </components.Popover>
  );
};
