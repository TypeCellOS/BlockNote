import { BlockNoteEditor } from "../../BlockNoteEditor";
import { Block, BlockSchema, PartialBlock } from "../Blocks/api/blocks/types";
import {
  InlineContentSchema,
  isStyledTextInlineContent,
} from "../Blocks/api/inlineContent/types";
import { StyleSchema } from "../Blocks/api/styles/types";
import { imageToolbarPluginKey } from "../ImageToolbar/ImageToolbarPlugin";
import { BaseSlashMenuItem } from "./BaseSlashMenuItem";

function setSelectionToNextContentEditableBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(editor: BlockNoteEditor<BSchema, I, S>) {
  let block = editor.getTextCursorPosition().block;
  let contentType = editor.blockSchema[block.type].content as
    | "inline"
    | "table"
    | "none";

  while (contentType === "none") {
    editor.setTextCursorPosition(block, "start");
    block = editor.getTextCursorPosition().nextBlock!;
    contentType = editor.blockSchema[block.type].content as
      | "inline"
      | "table"
      | "none";
  }

  editor.setTextCursorPosition(block, "start");
}

function insertOrUpdateBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  block: PartialBlock<BSchema, I, S>
): Block<BSchema, I, S> {
  const currentBlock = editor.getTextCursorPosition().block;

  if (currentBlock.content === undefined) {
    throw new Error("Slash Menu open in a block that doesn't contain content.");
  }

  if (
    Array.isArray(currentBlock.content) &&
    ((currentBlock.content.length === 1 &&
      isStyledTextInlineContent(currentBlock.content[0]) &&
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

export const getDefaultSlashMenuItems = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  // This type casting is weird, but it's the best way of doing it, as it allows
  // the schema type to be automatically inferred if it is defined, or be
  // inferred as any if it is not defined. I don't think it's possible to make it
  // infer to DefaultBlockSchema if it is not defined.
  schema: BSchema
) => {
  const slashMenuItems: BaseSlashMenuItem<BSchema, I, S>[] = [];

  if ("heading" in schema && "level" in schema.heading.propSchema) {
    // Command for creating a level 1 heading
    if (schema.heading.propSchema.level.values?.includes(1)) {
      slashMenuItems.push({
        name: "Heading",
        aliases: ["h", "heading1", "h1"],
        execute: (editor) =>
          insertOrUpdateBlock(editor, {
            type: "heading",
            props: { level: 1 },
          } as PartialBlock<BSchema, I, S>),
      });
    }

    // Command for creating a level 2 heading
    if (schema.heading.propSchema.level.values?.includes(2)) {
      slashMenuItems.push({
        name: "Heading 2",
        aliases: ["h2", "heading2", "subheading"],
        execute: (editor) =>
          insertOrUpdateBlock(editor, {
            type: "heading",
            props: { level: 2 },
          } as PartialBlock<BSchema, I, S>),
      });
    }

    // Command for creating a level 3 heading
    if (schema.heading.propSchema.level.values?.includes(3)) {
      slashMenuItems.push({
        name: "Heading 3",
        aliases: ["h3", "heading3", "subheading"],
        execute: (editor) =>
          insertOrUpdateBlock(editor, {
            type: "heading",
            props: { level: 3 },
          } as PartialBlock<BSchema, I, S>),
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
        } as PartialBlock<BSchema, I, S>),
    });
  }

  if ("numberedListItem" in schema) {
    slashMenuItems.push({
      name: "Numbered List",
      aliases: ["li", "list", "numberedlist", "numbered list"],
      execute: (editor) =>
        insertOrUpdateBlock(editor, {
          type: "numberedListItem",
        } as PartialBlock<BSchema, I, S>),
    });
  }

  if ("paragraph" in schema) {
    slashMenuItems.push({
      name: "Paragraph",
      aliases: ["p"],
      execute: (editor) =>
        insertOrUpdateBlock(editor, {
          type: "paragraph",
        } as PartialBlock<BSchema, I, S>),
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
              // TODO: replace with empty content before merging
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
        } as PartialBlock<BSchema, I, S>);
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
        } as PartialBlock<BSchema, I, S>);

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
