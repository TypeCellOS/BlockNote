import { BlockNoteEditor } from "../../BlockNoteEditor";
import { BlockSchema, PartialBlock } from "../Blocks/api/blockTypes";
import { BaseSlashMenuItem } from "./BaseSlashMenuItem";

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
    // Command for creating a level 1 heading
    if (schema.heading.propSchema.level.values?.includes("1")) {
      slashMenuItems.push({
        name: "Heading",
        aliases: ["h", "heading1", "h1"],
        execute: (editor) =>
          insertOrUpdateBlock(editor, {
            type: "heading",
            props: { level: "1" },
          } as PartialBlock<BSchema>),
      });
    }

    // Command for creating a level 2 heading
    if (schema.heading.propSchema.level.values?.includes("2")) {
      slashMenuItems.push({
        name: "Heading 2",
        aliases: ["h2", "heading2", "subheading"],
        execute: (editor) =>
          insertOrUpdateBlock(editor, {
            type: "heading",
            props: { level: "2" },
          } as PartialBlock<BSchema>),
      });
    }

    // Command for creating a level 3 heading
    if (schema.heading.propSchema.level.values?.includes("3")) {
      slashMenuItems.push({
        name: "Heading 3",
        aliases: ["h3", "heading3", "subheading"],
        execute: (editor) =>
          insertOrUpdateBlock(editor, {
            type: "heading",
            props: { level: "3" },
          } as PartialBlock<BSchema>),
      });
    }
  }

  if ("bulletListItem" in schema) {
    slashMenuItems.push({
      name: "Bullet List",
      aliases: ["ul", "list", "bulletlist", "bullet list"],
      execute: (editor) =>
        insertOrUpdateBlock(editor, {
          type: "bulletListItem",
        } as PartialBlock<BSchema>),
    });
  }

  if ("numberedListItem" in schema) {
    slashMenuItems.push({
      name: "Numbered List",
      aliases: ["li", "list", "numberedlist", "numbered list"],
      execute: (editor) =>
        insertOrUpdateBlock(editor, {
          type: "numberedListItem",
        } as PartialBlock<BSchema>),
    });
  }

  if ("paragraph" in schema) {
    slashMenuItems.push({
      name: "Paragraph",
      aliases: ["p"],
      execute: (editor) =>
        insertOrUpdateBlock(editor, {
          type: "paragraph",
        } as PartialBlock<BSchema>),
    });
  }

  return slashMenuItems;
};
