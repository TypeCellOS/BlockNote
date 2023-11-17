import { BlockNoteEditor } from "../../BlockNoteEditor";
import { Block, BlockSchema, PartialBlock } from "../Blocks/api/blockTypes";
import { defaultBlockSchema } from "../Blocks/api/defaultBlocks";
import { imageToolbarPluginKey } from "../ImageToolbar/ImageToolbarPlugin";
import { BaseSlashMenuItem } from "./BaseSlashMenuItem";

function setSelectionToNextContentEditableBlock<BSchema extends BlockSchema>(
  editor: BlockNoteEditor<BSchema>
) {
  let block = editor.getTextCursorPosition().block;
  let contentType = editor.schema[block.type].config.content as
    | "inline"
    | "table"
    | "none";

  while (contentType === "none") {
    editor.setTextCursorPosition(block, "start");
    block = editor.getTextCursorPosition().nextBlock!;
    contentType = editor.schema[block.type].config.content as
      | "inline"
      | "table"
      | "none";
  }

  editor.setTextCursorPosition(block, "start");
}

function insertOrUpdateBlock<BSchema extends BlockSchema>(
  editor: BlockNoteEditor<BSchema>,
  block: PartialBlock<BSchema>
): Block<BSchema> {
  const currentBlock = editor.getTextCursorPosition().block;

  if (currentBlock.content === undefined) {
    throw new Error("Slash Menu open in a block that doesn't contain content.");
  }

  if (
    Array.isArray(currentBlock.content) &&
    ((currentBlock.content.length === 1 &&
      currentBlock.content[0].type === "text" &&
      currentBlock.content[0].text === "/") ||
      currentBlock.content.length === 0)
  ) {
    editor.updateBlock(currentBlock, block);
  } else {
    editor.insertBlocks([block], currentBlock, "after");
    editor.setTextCursorPosition(editor.getTextCursorPosition().nextBlock!);
  }

  const insertedBlock = editor.getTextCursorPosition().block;
  setSelectionToNextContentEditableBlock(editor);

  return insertedBlock;
}

export const getDefaultSlashMenuItems = <BSchema extends BlockSchema>(
  // This type casting is weird, but it's the best way of doing it, as it allows
  // the schema type to be automatically inferred if it is defined, or be
  // inferred as any if it is not defined. I don't think it's possible to make it
  // infer to DefaultBlockSchema if it is not defined.
  schema: BSchema = defaultBlockSchema as unknown as BSchema
) => {
  const slashMenuItems: BaseSlashMenuItem<BSchema>[] = [];

  if ("heading" in schema && "level" in schema.heading.config.propSchema) {
    // Command for creating a level 1 heading
    if (schema.heading.config.propSchema.level.values?.includes(1)) {
      slashMenuItems.push({
        name: "Heading",
        aliases: ["h", "heading1", "h1"],
        execute: (editor) =>
          insertOrUpdateBlock(editor, {
            type: "heading",
            props: { level: 1 },
          } as PartialBlock<BSchema>),
      });
    }

    // Command for creating a level 2 heading
    if (schema.heading.config.propSchema.level.values?.includes(2)) {
      slashMenuItems.push({
        name: "Heading 2",
        aliases: ["h2", "heading2", "subheading"],
        execute: (editor) =>
          insertOrUpdateBlock(editor, {
            type: "heading",
            props: { level: 2 },
          } as PartialBlock<BSchema>),
      });
    }

    // Command for creating a level 3 heading
    if (schema.heading.config.propSchema.level.values?.includes(3)) {
      slashMenuItems.push({
        name: "Heading 3",
        aliases: ["h3", "heading3", "subheading"],
        execute: (editor) =>
          insertOrUpdateBlock(editor, {
            type: "heading",
            props: { level: 3 },
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

  if ("table" in schema) {
    slashMenuItems.push({
      name: "Table",
      aliases: ["table"],
      execute: (editor) => {
        insertOrUpdateBlock(editor, {
          type: "table",
          content: {
            type: "tableContent",
            rows: [
              {
                cells: [
                  "ab",
                  [{ type: "text", styles: { bold: true }, text: "hello" }],
                  "",
                ],
              },
              {
                cells: ["", "cd", ""],
              },
            ],
          },
        } as PartialBlock<BSchema>);
      },
    });
  }

  if ("image" in schema) {
    slashMenuItems.push({
      name: "Image",
      aliases: [
        "image",
        "imageUpload",
        "upload",
        "img",
        "picture",
        "media",
        "url",
        "drive",
        "dropbox",
      ],
      execute: (editor) => {
        const insertedBlock = insertOrUpdateBlock(editor, {
          type: "image",
        } as PartialBlock<BSchema>);

        // Immediately open the image toolbar
        editor._tiptapEditor.view.dispatch(
          editor._tiptapEditor.state.tr.setMeta(imageToolbarPluginKey, {
            block: insertedBlock,
          })
        );
      },
    });
  }

  return slashMenuItems;
};
