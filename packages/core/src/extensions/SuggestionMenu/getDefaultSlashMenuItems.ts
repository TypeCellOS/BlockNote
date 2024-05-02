import { Block, PartialBlock } from "../../blocks/defaultBlocks";
import { checkDefaultBlockTypeInSchema } from "../../blocks/defaultBlockTypeGuards";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import {
  BlockSchema,
  InlineContentSchema,
  isStyledTextInlineContent,
  StyleSchema,
} from "../../schema";
import { formatKeyboardShortcut } from "../../util/browser";
import { DefaultSuggestionItem } from "./DefaultSuggestionItem";

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
  let contentType = editor.schema.blockSchema[block.type].content;

  while (contentType === "none") {
    block = editor.getTextCursorPosition().nextBlock!;
    contentType = editor.schema.blockSchema[block.type].content as
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
export function insertOrUpdateBlock<
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

export function getDefaultSlashMenuItems<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(editor: BlockNoteEditor<BSchema, I, S>) {
  const items: DefaultSuggestionItem[] = [];

  if (checkDefaultBlockTypeInSchema("heading", editor)) {
    items.push(
      {
        title: "Heading 1",
        onItemClick: () => {
          insertOrUpdateBlock(editor, {
            type: "heading",
            props: { level: 1 },
          });
        },
        subtext: "Used for a top-level heading",
        badge: formatKeyboardShortcut("Mod-Alt-1"),
        aliases: ["h", "heading1", "h1"],
        group: "Headings",
      },
      {
        title: "Heading 2",
        onItemClick: () => {
          insertOrUpdateBlock(editor, {
            type: "heading",
            props: { level: 2 },
          });
        },
        subtext: "Used for key sections",
        badge: formatKeyboardShortcut("Mod-Alt-2"),
        aliases: ["h2", "heading2", "subheading"],
        group: "Headings",
      },
      {
        title: "Heading 3",
        onItemClick: () => {
          insertOrUpdateBlock(editor, {
            type: "heading",
            props: { level: 3 },
          });
        },
        subtext: "Used for subsections and group headings",
        badge: formatKeyboardShortcut("Mod-Alt-3"),
        aliases: ["h3", "heading3", "subheading"],
        group: "Headings",
      }
    );
  }

  if (checkDefaultBlockTypeInSchema("numberedListItem", editor)) {
    items.push({
      title: "Numbered List",
      onItemClick: () => {
        insertOrUpdateBlock(editor, {
          type: "numberedListItem",
        });
      },
      subtext: "Used to display a numbered list",
      badge: formatKeyboardShortcut("Mod-Shift-7"),
      aliases: ["ol", "li", "list", "numberedlist", "numbered list"],
      group: "Basic blocks",
    });
  }

  if (checkDefaultBlockTypeInSchema("bulletListItem", editor)) {
    items.push({
      title: "Bullet List",
      onItemClick: () => {
        insertOrUpdateBlock(editor, {
          type: "bulletListItem",
        });
      },
      subtext: "Used to display an unordered list",
      badge: formatKeyboardShortcut("Mod-Shift-8"),
      aliases: ["ul", "li", "list", "bulletlist", "bullet list"],
      group: "Basic blocks",
    });
  }

  if (checkDefaultBlockTypeInSchema("paragraph", editor)) {
    items.push({
      title: "Paragraph",
      onItemClick: () => {
        insertOrUpdateBlock(editor, {
          type: "paragraph",
        });
      },
      subtext: "Used for the body of your document",
      badge: formatKeyboardShortcut("Mod-Alt-0"),
      aliases: ["p", "paragraph"],
      group: "Basic blocks",
    });
  }

  if (checkDefaultBlockTypeInSchema("table", editor)) {
    items.push({
      title: "Table",
      onItemClick: () => {
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
        });
      },
      subtext: "Used for for tables",
      aliases: ["table"],
      group: "Advanced",
      badge: undefined,
    });
  }

  if (checkDefaultBlockTypeInSchema("image", editor)) {
    items.push({
      title: "Image",
      onItemClick: () => {
        const insertedBlock = insertOrUpdateBlock(editor, {
          type: "image",
        });

        // Immediately open the image toolbar
        editor.prosemirrorView.dispatch(
          editor._tiptapEditor.state.tr.setMeta(editor.imagePanel!.plugin, {
            block: insertedBlock,
          })
        );
      },
      subtext: "Insert an image",
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
      group: "Media",
    });
  }

  return items;
}

export function filterSuggestionItems<
  T extends { title: string; aliases?: readonly string[] }
>(items: T[], query: string) {
  return items.filter(
    ({ title, aliases }) =>
      title.toLowerCase().includes(query.toLowerCase()) ||
      (aliases &&
        aliases.filter((alias) =>
          alias.toLowerCase().includes(query.toLowerCase())
        ).length !== 0)
  );
}
