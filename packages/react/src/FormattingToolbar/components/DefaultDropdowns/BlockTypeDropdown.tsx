import { useEffect, useState } from "react";
import {
  BlockNoteEditor,
  BlockSchema,
  defaultBlockSchema,
  PartialBlock,
} from "@blocknote/core";
import {
  RiH1,
  RiH2,
  RiH3,
  RiListOrdered,
  RiListUnordered,
  RiText,
} from "react-icons/ri";
import { ToolbarDropdown } from "../../../SharedComponents/Toolbar/components/ToolbarDropdown";

const arrayEquals = (a: readonly string[], b: readonly string[]) => {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
};

const shouldShow = (schema: BlockSchema) => {
  const paragraph = "paragraph" in schema;
  const heading =
    "heading" in schema &&
    "level" in schema.heading.propSchema &&
    arrayEquals(
      schema.heading.propSchema.level.values as string[],
      defaultBlockSchema.heading.propSchema.level.values
    );
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
        {
          onClick: () => {
            props.editor.focus();
            props.editor.updateBlock(block, {
              type: "heading",
              props: { level: "1" },
            } as PartialBlock<BSchema>);
          },
          text: "Heading 1",
          icon: RiH1,
          isSelected: block.type === "heading" && block.props.level === "1",
        },
        {
          onClick: () => {
            props.editor.focus();
            props.editor.updateBlock(block, {
              type: "heading",
              props: { level: "2" },
            } as PartialBlock<BSchema>);
          },
          text: "Heading 2",
          icon: RiH2,
          isSelected: block.type === "heading" && block.props.level === "2",
        },
        {
          onClick: () => {
            props.editor.focus();
            props.editor.updateBlock(block, {
              type: "heading",
              props: { level: "3" },
            } as PartialBlock<BSchema>);
          },
          text: "Heading 3",
          icon: RiH3,
          isSelected: block.type === "heading" && block.props.level === "3",
        },
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
