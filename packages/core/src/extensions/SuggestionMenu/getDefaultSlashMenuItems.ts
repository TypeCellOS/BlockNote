import { Block, PartialBlock } from "../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

import { checkDefaultBlockTypeInSchema } from "../../blocks/defaultBlockTypeGuards.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
  isStyledTextInlineContent,
} from "../../schema/index.js";
import { formatKeyboardShortcut } from "../../util/browser.js";
import { DefaultSuggestionItem } from "./DefaultSuggestionItem.js";

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

  let newBlock: Block<BSchema, I, S>;

  if (
    Array.isArray(currentBlock.content) &&
    ((currentBlock.content.length === 1 &&
      isStyledTextInlineContent(currentBlock.content[0]) &&
      currentBlock.content[0].type === "text" &&
      currentBlock.content[0].text === "/") ||
      currentBlock.content.length === 0)
  ) {
    newBlock = editor.updateBlock(currentBlock, block);
    // We make sure to reset the cursor position to the new block as calling
    // `updateBlock` may move it out. This generally happens when the content
    // changes, or the update makes the block multi-column.
    editor.setTextCursorPosition(newBlock);
  } else {
    newBlock = editor.insertBlocks([block], currentBlock, "after")[0];
    editor.setTextCursorPosition(editor.getTextCursorPosition().nextBlock!);
  }

  setSelectionToNextContentEditableBlock(editor);

  return newBlock;
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
        onItemClick: () => {
          insertOrUpdateBlock(editor, {
            type: "heading",
            props: { level: 1 },
          });
        },
        badge: formatKeyboardShortcut("Mod-Alt-1"),
        key: "heading",
        ...editor.dictionary.slash_menu.heading,
      },
      {
        onItemClick: () => {
          insertOrUpdateBlock(editor, {
            type: "heading",
            props: { level: 2 },
          });
        },
        badge: formatKeyboardShortcut("Mod-Alt-2"),
        key: "heading_2",
        ...editor.dictionary.slash_menu.heading_2,
      },
      {
        onItemClick: () => {
          insertOrUpdateBlock(editor, {
            type: "heading",
            props: { level: 3 },
          });
        },
        badge: formatKeyboardShortcut("Mod-Alt-3"),
        key: "heading_3",
        ...editor.dictionary.slash_menu.heading_3,
      }
    );
  }

  if (checkDefaultBlockTypeInSchema("numberedListItem", editor)) {
    items.push({
      onItemClick: () => {
        insertOrUpdateBlock(editor, {
          type: "numberedListItem",
        });
      },
      badge: formatKeyboardShortcut("Mod-Shift-7"),
      key: "numbered_list",
      ...editor.dictionary.slash_menu.numbered_list,
    });
  }

  if (checkDefaultBlockTypeInSchema("bulletListItem", editor)) {
    items.push({
      onItemClick: () => {
        insertOrUpdateBlock(editor, {
          type: "bulletListItem",
        });
      },
      badge: formatKeyboardShortcut("Mod-Shift-8"),
      key: "bullet_list",
      ...editor.dictionary.slash_menu.bullet_list,
    });
  }

  if (checkDefaultBlockTypeInSchema("checkListItem", editor)) {
    items.push({
      onItemClick: () => {
        insertOrUpdateBlock(editor, {
          type: "checkListItem",
        });
      },
      badge: formatKeyboardShortcut("Mod-Shift-9"),
      key: "check_list",
      ...editor.dictionary.slash_menu.check_list,
    });
  }

  if (checkDefaultBlockTypeInSchema("paragraph", editor)) {
    items.push({
      onItemClick: () => {
        insertOrUpdateBlock(editor, {
          type: "paragraph",
        });
      },
      badge: formatKeyboardShortcut("Mod-Alt-0"),
      key: "paragraph",
      ...editor.dictionary.slash_menu.paragraph,
    });
  }

  if (checkDefaultBlockTypeInSchema("codeBlock", editor)) {
    items.push({
      onItemClick: () => {
        insertOrUpdateBlock(editor, {
          type: "codeBlock",
        });
      },
      badge: formatKeyboardShortcut("Mod-Alt-c"),
      key: "code_block",
      ...editor.dictionary.slash_menu.code_block,
    });
  }

  if (checkDefaultBlockTypeInSchema("table", editor)) {
    items.push({
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
      badge: undefined,
      key: "table",
      ...editor.dictionary.slash_menu.table,
    });
  }

  if (checkDefaultBlockTypeInSchema("image", editor)) {
    items.push({
      onItemClick: () => {
        const insertedBlock = insertOrUpdateBlock(editor, {
          type: "image",
        });

        // Immediately open the file toolbar
        editor.dispatch(
          editor._tiptapEditor.state.tr.setMeta(editor.filePanel!.plugin, {
            block: insertedBlock,
          })
        );
      },
      key: "image",
      ...editor.dictionary.slash_menu.image,
    });
  }

  if (checkDefaultBlockTypeInSchema("video", editor)) {
    items.push({
      onItemClick: () => {
        const insertedBlock = insertOrUpdateBlock(editor, {
          type: "video",
        });

        // Immediately open the file toolbar
        editor.dispatch(
          editor._tiptapEditor.state.tr.setMeta(editor.filePanel!.plugin, {
            block: insertedBlock,
          })
        );
      },
      key: "video",
      ...editor.dictionary.slash_menu.video,
    });
  }

  if (checkDefaultBlockTypeInSchema("audio", editor)) {
    items.push({
      onItemClick: () => {
        const insertedBlock = insertOrUpdateBlock(editor, {
          type: "audio",
        });

        // Immediately open the file toolbar
        editor.dispatch(
          editor._tiptapEditor.state.tr.setMeta(editor.filePanel!.plugin, {
            block: insertedBlock,
          })
        );
      },
      key: "audio",
      ...editor.dictionary.slash_menu.audio,
    });
  }

  if (checkDefaultBlockTypeInSchema("file", editor)) {
    items.push({
      onItemClick: () => {
        const insertedBlock = insertOrUpdateBlock(editor, {
          type: "file",
        });

        // Immediately open the file toolbar
        editor.dispatch(
          editor._tiptapEditor.state.tr.setMeta(editor.filePanel!.plugin, {
            block: insertedBlock,
          })
        );
      },
      key: "file",
      ...editor.dictionary.slash_menu.file,
    });
  }

  items.push({
    onItemClick: () => {
      editor.openSuggestionMenu(":", {
        deleteTriggerCharacter: true,
        ignoreQueryLength: true,
      });
    },
    key: "emoji",
    ...editor.dictionary.slash_menu.emoji,
  });

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
