import { useBlockNoteEditor } from "../../../editor/BlockNoteContext";
import {
  Block,
  BlockFromConfig,
  BlockNoteEditor,
  BlockSchema,
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

import { ToolbarButton } from "../../../components-shared/Toolbar/ToolbarButton";
import { ToolbarInputDropdown } from "../../../components-shared/Toolbar/ToolbarInputDropdown";
import { ToolbarInputDropdownButton } from "../../../components-shared/Toolbar/ToolbarInputDropdownButton";
import { ToolbarInputDropdownItem } from "../../../components-shared/Toolbar/ToolbarInputDropdownItem";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks";

type BaseImageBlockConfig = {
  type: "image";
  propSchema: {
    caption: {
      default: string;
    };
    url: {
      default: string;
    };
  };
  content: "none";
};

function checkImageInSchema(
  // TODO: Fix any, should be BlockSchema but smth is broken
  editor: BlockNoteEditor<any, InlineContentSchema, StyleSchema>
): editor is BlockNoteEditor<
  { image: BaseImageBlockConfig },
  InlineContentSchema,
  StyleSchema
> {
  return (
    // Checks if the block has a `caption` prop which can take any string
    // value.
    "caption" in editor.blockSchema["image"].propSchema &&
    typeof editor.blockSchema["image"].propSchema.caption.default ===
      "string" &&
    !("values" in editor.blockSchema["image"].propSchema.caption) &&
    // Checks if the block has a `url` prop which can take any string value.
    "url" in editor.blockSchema["image"].propSchema &&
    typeof editor.blockSchema["image"].propSchema.url.default === "string" &&
    !("values" in editor.blockSchema["image"].propSchema.url) === undefined
  );
}

export function checkBlockIsImage(
  // TODO: Fix any, should be BlockSchema but smth is broken
  block: Block<any, InlineContentSchema, StyleSchema>,
  editor: BlockNoteEditor<any, InlineContentSchema, StyleSchema>
): block is BlockFromConfig<
  BaseImageBlockConfig,
  InlineContentSchema,
  StyleSchema
> {
  return (
    // Checks if the selected block is an image.
    block.type === "image" && checkImageInSchema(editor)
  );
}

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
