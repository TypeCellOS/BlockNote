import { useMemo, useState } from "react";
import {
  Block,
  BlockNoteEditor,
  BlockSchema,
  PartialBlock,
} from "@blocknote/core";
import { IconType } from "react-icons";
import {
  RiH1,
  RiH2,
  RiH3,
  RiListOrdered,
  RiListUnordered,
  RiText,
} from "react-icons/ri";

import {
  ToolbarDropdown,
  ToolbarDropdownProps,
} from "../../../SharedComponents/Toolbar/components/ToolbarDropdown";
import { useEditorSelectionChange } from "../../../hooks/useEditorSelectionChange";
import { useEditorContentChange } from "../../../hooks/useEditorContentChange";

type HeadingLevels = "1" | "2" | "3";

const headingIcons: Record<HeadingLevels, IconType> = {
  "1": RiH1,
  "2": RiH2,
  "3": RiH3,
};

const shouldShow = <BSchema extends BlockSchema>(block: Block<BSchema>) => {
  if (block.type === "paragraph") {
    return true;
  }

  if (block.type === "heading" && "level" in block.props) {
    return true;
  }

  if (block.type === "bulletListItem") {
    return true;
  }

  return block.type === "numberedListItem";
};

export const BlockTypeDropdown = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const [block, setBlock] = useState(
    props.editor.getTextCursorPosition().block
  );

  const dropdownItems: ToolbarDropdownProps["items"] = useMemo(() => {
    const items: ToolbarDropdownProps["items"] = [];

    if ("paragraph" in props.editor.schema) {
      items.push({
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
      });
    }

    if (
      "heading" in props.editor.schema &&
      "level" in props.editor.schema.heading.propSchema
    ) {
      items.push(
        ...(["1", "2", "3"] as const).map((level) => ({
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
        }))
      );
    }

    if ("bulletListItem" in props.editor.schema) {
      items.push({
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
      });
    }

    if ("numberedListItem" in props.editor.schema) {
      items.push({
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
      });
    }

    return items;
  }, [block, props.editor]);

  useEditorContentChange(props.editor, () => {
    setBlock(props.editor.getTextCursorPosition().block);
  });

  useEditorSelectionChange(props.editor, () => {
    setBlock(props.editor.getTextCursorPosition().block);
  });

  if (!shouldShow(block)) {
    return null;
  }

  return <ToolbarDropdown items={dropdownItems} />;
};
