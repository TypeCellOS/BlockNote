import { useEffect, useState } from "react";
import { BlockNoteEditor, BlockSchema, PartialBlock } from "@blocknote/core";
import {
  RiH1,
  RiH2,
  RiH3,
  RiListOrdered,
  RiListUnordered,
  RiText,
} from "react-icons/ri";
import { ToolbarDropdown } from "../../../SharedComponents/Toolbar/components/ToolbarDropdown";
import { IconType } from "react-icons";

type HeadingLevels = "1" | "2" | "3";

const headingIcons: Record<HeadingLevels, IconType> = {
  "1": RiH1,
  "2": RiH2,
  "3": RiH3,
};

const shouldShow = (schema: BlockSchema) => {
  const paragraph = "paragraph" in schema;
  const heading = "heading" in schema && "level" in schema.heading.propSchema;
  const bulletListItem = "bulletListItem" in schema;
  const numberedListItem = "numberedListItem" in schema;

  return paragraph && heading && bulletListItem && numberedListItem;
};

export const BlockTypeDropdown = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const [block, setBlock] = useState(
    props.editor.getTextCursorPosition().block
  );

  useEffect(
    () => setBlock(props.editor.getTextCursorPosition().block),
    [props]
  );

  if (!shouldShow(props.editor.schema)) {
    return null;
  }

  const headingItems = (
    props.editor.schema.heading.propSchema.level.values! as HeadingLevels[]
  ).map((level) => ({
    onClick: () => {
      props.editor.focus();
      props.editor.updateBlock(block, {
        type: "heading",
        props: { level: level },
      } as PartialBlock<BSchema>);
    },
    text: "Heading " + level,
    icon: headingIcons[level],
    isSelected: block.type === "heading" && block.props.level === level,
  }));

  return (
    <ToolbarDropdown
      items={[
        {
          onClick: () => {
            props.editor.focus();
            props.editor.updateBlock(block, {
              type: "paragraph",
              props: {},
            });
          },
          text: "Paragraph",
          icon: RiText,
          isSelected: block.type === "paragraph",
        },
        ...headingItems,
        {
          onClick: () => {
            props.editor.focus();
            props.editor.updateBlock(block, {
              type: "bulletListItem",
              props: {},
            });
          },
          text: "Bullet List",
          icon: RiListUnordered,
          isSelected: block.type === "bulletListItem",
        },
        {
          onClick: () => {
            props.editor.focus();
            props.editor.updateBlock(block, {
              type: "numberedListItem",
              props: {},
            });
          },
          text: "Numbered List",
          icon: RiListOrdered,
          isSelected: block.type === "numberedListItem",
        },
      ]}
    />
  );
};
