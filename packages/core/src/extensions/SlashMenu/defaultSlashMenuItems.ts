import { BlockNoteEditor } from "../../BlockNoteEditor";
import { BlockSchema, PartialBlock } from "../Blocks/api/blockTypes";
import {
  BaseSlashMenuItem,
  createBaseSlashMenuItem,
} from "./BaseSlashMenuItem";

function insertOrUpdateBlock<BSchema extends BlockSchema>(
  editor: BlockNoteEditor<BSchema>,
  block: PartialBlock<BSchema>
) {
  const currentBlock = editor.getTextCursorPosition().block;

  if (
    (currentBlock.content.length === 1 &&
      currentBlock.content[0].type === "text" &&
      currentBlock.content[0].text === "/") ||
    currentBlock.content.length === 0
  ) {
    editor.updateBlock(currentBlock, block);
  } else {
    editor.insertBlocks([block], currentBlock, "after");
    editor.setTextCursorPosition(editor.getTextCursorPosition().nextBlock!);
  }
}

export const getDefaultSlashMenuItems = <BSchema extends BlockSchema>(
  schema: BSchema
) => {
  const slashMenuItems: BaseSlashMenuItem<BSchema>[] = [];

  if ("heading" in schema && "level" in schema.heading.propSchema) {
    if (schema.heading.propSchema.level.values?.includes("1")) {
      slashMenuItems.push(
        // Command for creating a level 1 heading
        createBaseSlashMenuItem(
          "Heading",
          (editor) =>
            insertOrUpdateBlock(editor, {
              type: "heading",
              props: { level: "1" },
            } as PartialBlock<BSchema>),
          ["h", "heading1", "h1"]
        )
      );
    }

    if (schema.heading.propSchema.level.values?.includes("2")) {
      slashMenuItems.push(
        // Command for creating a level 2 heading
        createBaseSlashMenuItem(
          "Heading 2",
          (editor) =>
            insertOrUpdateBlock(editor, {
              type: "heading",
              props: { level: "2" },
            } as PartialBlock<BSchema>),
          ["h2", "heading2", "subheading"]
        )
      );
    }

    if (schema.heading.propSchema.level.values?.includes("3")) {
      slashMenuItems.push(
        // Command for creating a level 3 heading
        createBaseSlashMenuItem(
          "Heading 3",
          (editor) =>
            insertOrUpdateBlock(editor, {
              type: "heading",
              props: { level: "3" },
            } as PartialBlock<BSchema>),
          ["h3", "heading3", "subheading"]
        )
      );
    }
  }

  if ("bulletListItem" in schema) {
    slashMenuItems.push(
      // Command for creating a bullet list item
      createBaseSlashMenuItem(
        "Bullet List",
        (editor) =>
          insertOrUpdateBlock(editor, {
            type: "bulletListItem",
          } as PartialBlock<BSchema>),
        ["ul", "list", "bulletlist", "bullet list"]
      )
    );
  }

  if ("numberedListItem" in schema) {
    slashMenuItems.push(
      // Command for creating a numbered list item
      createBaseSlashMenuItem(
        "Numbered List",
        (editor) =>
          insertOrUpdateBlock(editor, {
            type: "numberedListItem",
          } as PartialBlock<BSchema>),
        ["li", "list", "numberedlist", "numbered list"]
      )
    );
  }

  if ("paragraph" in schema) {
    slashMenuItems.push(
      // Command for creating a paragraph
      createBaseSlashMenuItem(
        "Paragraph",
        (editor) =>
          insertOrUpdateBlock(editor, {
            type: "paragraph",
          } as PartialBlock<BSchema>),
        ["p"]
      )
    );
  }

  return slashMenuItems;
};
