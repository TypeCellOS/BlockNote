import { Block, PartialBlock } from "../../blocks/defaultBlocks.js";
import {
  editorHasBlockType,
  editorHasBlockTypeAndPropsAreValid,
} from "../../blocks/defaultBlockTypeGuards.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
  isStyledTextInlineContent,
} from "../../schema/index.js";
import { formatKeyboardShortcut } from "../../util/browser.js";
import { FilePanelExtension } from "../FilePanel/FilePanel.js";
import { DefaultSuggestionItem } from "./DefaultSuggestionItem.js";
import { SuggestionMenu } from "./SuggestionMenu.js";

// Sets the editor's text cursor position to the next content editable block,
// so either a block with inline content or a table. The last block is always a
// paragraph, so this function won't try to set the cursor position past the
// last block.
function setSelectionToNextContentEditableBlock<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(editor: BlockNoteEditor<BSchema, I, S>) {
  let block: Block<BSchema, I, S> | undefined =
    editor.getTextCursorPosition().block;
  let contentType = editor.schema.blockSchema[block.type].content;

  while (contentType === "none") {
    block = editor.getTextCursorPosition().nextBlock;
    if (block === undefined) {
      return;
    }
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
export function insertOrUpdateBlockForSlashMenu<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  block: PartialBlock<BSchema, I, S>,
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
  S extends StyleSchema,
>(editor: BlockNoteEditor<BSchema, I, S>) {
  const items: DefaultSuggestionItem[] = [];

  if (editorHasBlockType(editor, "heading")) {
    for (const level of [1, 2, 3, 4, 5, 6] as const) {
      if (editorHasBlockTypeAndPropsAreValid(editor, "heading", { level })) {
        items.push({
          onItemClick: () => {
            insertOrUpdateBlockForSlashMenu(editor, {
              type: "heading",
              props: { level },
            });
          },
          badge: formatKeyboardShortcut(`Mod-Alt-${level}`),
          key: `heading_${level}`,
          ...editor.dictionary.slash_menu[`heading_${level}`],
        });
      }
    }
  }
  if (editorHasBlockType(editor, "quote")) {
    items.push({
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: "quote",
        });
      },
      key: "quote",
      ...editor.dictionary.slash_menu.quote,
    });
  }

  if (editorHasBlockType(editor, "toggleListItem")) {
    items.push({
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: "toggleListItem",
        });
      },
      badge: formatKeyboardShortcut("Mod-Shift-6"),
      key: "toggle_list",
      ...editor.dictionary.slash_menu.toggle_list,
    });
  }

  if (editorHasBlockType(editor, "numberedListItem")) {
    items.push({
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: "numberedListItem",
        });
      },
      badge: formatKeyboardShortcut("Mod-Shift-7"),
      key: "numbered_list",
      ...editor.dictionary.slash_menu.numbered_list,
    });
  }

  if (editorHasBlockType(editor, "bulletListItem")) {
    items.push({
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: "bulletListItem",
        });
      },
      badge: formatKeyboardShortcut("Mod-Shift-8"),
      key: "bullet_list",
      ...editor.dictionary.slash_menu.bullet_list,
    });
  }

  if (editorHasBlockType(editor, "checkListItem")) {
    items.push({
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: "checkListItem",
        });
      },
      badge: formatKeyboardShortcut("Mod-Shift-9"),
      key: "check_list",
      ...editor.dictionary.slash_menu.check_list,
    });
  }

  if (editorHasBlockType(editor, "paragraph")) {
    items.push({
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: "paragraph",
        });
      },
      badge: formatKeyboardShortcut("Mod-Alt-0"),
      key: "paragraph",
      ...editor.dictionary.slash_menu.paragraph,
    });
  }

  if (editorHasBlockType(editor, "codeBlock")) {
    items.push({
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: "codeBlock",
        });
      },
      badge: formatKeyboardShortcut("Mod-Alt-c"),
      key: "code_block",
      ...editor.dictionary.slash_menu.code_block,
    });
  }

  if (editorHasBlockType(editor, "divider")) {
    items.push({
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, { type: "divider" });
      },
      key: "divider",
      ...editor.dictionary.slash_menu.divider,
    });
  }

  if (editorHasBlockType(editor, "table")) {
    items.push({
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
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
          } as any,
        });
      },
      badge: undefined,
      key: "table",
      ...editor.dictionary.slash_menu.table,
    });
  }

  if (editorHasBlockType(editor, "image")) {
    items.push({
      onItemClick: () => {
        const insertedBlock = insertOrUpdateBlockForSlashMenu(editor, {
          type: "image",
        });

        // Immediately open the file toolbar
        editor.getExtension(FilePanelExtension)?.showMenu(insertedBlock.id);
      },
      key: "image",
      ...editor.dictionary.slash_menu.image,
    });
  }

  if (editorHasBlockType(editor, "video")) {
    items.push({
      onItemClick: () => {
        const insertedBlock = insertOrUpdateBlockForSlashMenu(editor, {
          type: "video",
        });

        // Immediately open the file toolbar
        editor.getExtension(FilePanelExtension)?.showMenu(insertedBlock.id);
      },
      key: "video",
      ...editor.dictionary.slash_menu.video,
    });
  }

  if (editorHasBlockType(editor, "audio")) {
    items.push({
      onItemClick: () => {
        const insertedBlock = insertOrUpdateBlockForSlashMenu(editor, {
          type: "audio",
        });

        // Immediately open the file toolbar
        editor.getExtension(FilePanelExtension)?.showMenu(insertedBlock.id);
      },
      key: "audio",
      ...editor.dictionary.slash_menu.audio,
    });
  }

  if (editorHasBlockType(editor, "file")) {
    items.push({
      onItemClick: () => {
        const insertedBlock = insertOrUpdateBlockForSlashMenu(editor, {
          type: "file",
        });

        // Immediately open the file toolbar
        editor.getExtension(FilePanelExtension)?.showMenu(insertedBlock.id);
      },
      key: "file",
      ...editor.dictionary.slash_menu.file,
    });
  }

  if (editorHasBlockType(editor, "heading")) {
    for (const level of [1, 2, 3] as const) {
      if (
        editorHasBlockTypeAndPropsAreValid(editor, "heading", {
          level,
          isToggleable: true,
        })
      ) {
        items.push({
          onItemClick: () => {
            insertOrUpdateBlockForSlashMenu(editor, {
              type: "heading",
              props: { level: 2, isToggleable: true },
            });
          },
          key: `toggle_heading_${level}`,
          ...editor.dictionary.slash_menu[`toggle_heading_${level}`],
        });
      }
    }
  }

  items.push({
    onItemClick: () => {
      editor.getExtension(SuggestionMenu)?.openSuggestionMenu(":", {
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
  T extends { title: string; aliases?: readonly string[] },
>(items: T[], query: string) {
  return items.filter(
    ({ title, aliases }) =>
      title.toLowerCase().includes(query.toLowerCase()) ||
      (aliases &&
        aliases.filter((alias) =>
          alias.toLowerCase().includes(query.toLowerCase()),
        ).length !== 0),
  );
}
