import {
  Block,
  BlockFromConfig,
  BlockNoteEditor,
  BlockSchema,
  defaultProps,
  DefaultProps,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useCallback, useMemo } from "react";
import { IconType } from "react-icons";
import {
  RiAlignCenter,
  RiAlignJustify,
  RiAlignLeft,
  RiAlignRight,
} from "react-icons/ri";

import { useBlockNoteEditor } from "../../../editor/BlockNoteContext";
import { useSelectedBlocks } from "../../../hooks/useSelectedBlocks";
import { ToolbarButton } from "../../../components-shared/Toolbar/ToolbarButton";

type TextAlignment = DefaultProps["textAlignment"];

type BlockConfigWithTextAlignment = {
  type: string;
  propSchema: {
    textAlignment: {
      default: TextAlignment;
      values: typeof defaultProps.textAlignment.values;
    };
  };
  content: "inline" | "table" | "none";
};

const checkTextAlignmentValues = (
  values: readonly string[]
): values is typeof defaultProps.textAlignment.values => {
  return (
    values.length === defaultProps.textAlignment.values.length &&
    values.every((value) =>
      defaultProps.textAlignment.values.includes(value as TextAlignment)
    )
  );
};

function checkBlockTypeHasTextAlignment(
  blockType: string,
  editor: BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>
) {
  return (
    // Block type has textAlignment prop
    blockType in editor.blockSchema &&
    "textAlignment" in editor.blockSchema[blockType].propSchema &&
    // Default textAlignment value is valid
    defaultProps.textAlignment.values.includes(
      editor.blockSchema[blockType].propSchema.textAlignment
        .default as TextAlignment
    ) &&
    // textAlignment values are valid
    "values" in editor.blockSchema[blockType].propSchema.textAlignment &&
    checkTextAlignmentValues(
      editor.blockSchema[blockType].propSchema.textAlignment.values as string[]
    )
  );
}

function checkBlockHasTextAlignment(
  block: Block<BlockSchema, InlineContentSchema, StyleSchema>,
  editor: BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>
): block is BlockFromConfig<
  BlockConfigWithTextAlignment,
  InlineContentSchema,
  StyleSchema
> {
  return checkBlockTypeHasTextAlignment(block.type, editor);
}

function checkAllBlocksHaveTextAlignment(
  editor: BlockNoteEditor<any, InlineContentSchema, StyleSchema>
): editor is BlockNoteEditor<
  Record<string, BlockConfigWithTextAlignment>,
  InlineContentSchema,
  StyleSchema
> {
  return Object.keys(editor.blockSchema).every((blockType) => {
    return checkBlockTypeHasTextAlignment(blockType, editor);
  });
}

const icons: Record<TextAlignment, IconType> = {
  left: RiAlignLeft,
  center: RiAlignCenter,
  right: RiAlignRight,
  justify: RiAlignJustify,
};

export const TextAlignButton = (props: { textAlignment: TextAlignment }) => {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const selectedBlocks = useSelectedBlocks(editor);

  const textAlignment = useMemo(() => {
    const block = selectedBlocks[0];

    if (checkBlockHasTextAlignment(block, editor)) {
      return block.props.textAlignment;
    }

    return;
  }, [editor, selectedBlocks]);

  const setTextAlignment = useCallback(
    (textAlignment: TextAlignment) => {
      editor.focus();

      for (const block of selectedBlocks) {
        if (checkAllBlocksHaveTextAlignment(editor)) {
          editor.updateBlock(block, {
            props: { textAlignment: textAlignment },
          });
        }
      }
    },
    [editor, selectedBlocks]
  );

  const show = useMemo(() => {
    return !!selectedBlocks.find((block) => "textAlignment" in block.props);
  }, [selectedBlocks]);

  if (!show) {
    return null;
  }

  return (
    <ToolbarButton
      onClick={() => setTextAlignment(props.textAlignment)}
      isSelected={textAlignment === props.textAlignment}
      mainTooltip={
        props.textAlignment === "justify"
          ? "Justify Text"
          : "Align Text " +
            props.textAlignment.slice(0, 1).toUpperCase() +
            props.textAlignment.slice(1)
      }
      icon={icons[props.textAlignment]}
    />
  );
};
