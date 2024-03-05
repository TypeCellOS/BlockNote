import { defaultBlockSchema } from "../../blocks/defaultBlocks";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import {
  Block,
  BlockSchema,
  InlineContentSchema,
  PartialBlock,
  StyleSchema,
  isStyledTextInlineContent,
} from "../../schema";
import { imageToolbarPluginKey } from "../ImageToolbar/ImageToolbarPlugin";
import { BaseSlashMenuItem } from "./BaseSlashMenuItem";

// Sets the editor's text cursor position to the next content editable block,
// so either a block with inline content or a table. The last block is always a
// paragraph, so this function won't try to set the cursor position past the
// last block.
function setSelectionToNextContentEditableBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(editor: BlockNoteEditor<BSchema, I, S>) {
  let block = editor.getTextCursorPosition().block;
  let contentType = editor.blockSchema[block.type].content;

  while (contentType === "none") {
    block = editor.getTextCursorPosition().nextBlock!;
    contentType = editor.blockSchema[block.type].content as
      | "inline"
      | "table"
      | "none";
    editor.setTextCursorPosition(block, "end");
  }
}

// Checks if the current block is empty or only contains a slash, and if so,
// updates the current block instead of inserting a new one below. If the new
// block doesn't contain editable content, the cursor is moved to the next block
// that does.
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
    editor.setTextCursorPosition(
      editor.getTextCursorPosition().nextBlock!,
      "end"
    );
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
  schema: BSchema = defaultBlockSchema as unknown as BSchema
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
        }),
    });
  }

  if ("numberedListItem" in schema) {
    slashMenuItems.push({
      name: "Numbered List",
      aliases: ["li", "list", "numberedlist", "numbered list"],
      execute: (editor) =>
        insertOrUpdateBlock(editor, {
          type: "numberedListItem",
        }),
    });
  }

  if ("paragraph" in schema) {
    slashMenuItems.push({
      name: "Paragraph",
      aliases: ["p"],
      execute: (editor) =>
        insertOrUpdateBlock(editor, {
          type: "paragraph",
        }),
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
                cells: ["", "", ""],
              },
              {
                cells: ["", "", ""],
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
        });

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
