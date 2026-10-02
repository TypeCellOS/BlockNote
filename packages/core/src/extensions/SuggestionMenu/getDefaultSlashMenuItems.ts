import { Block, PartialBlock } from "../../blocks/defaultBlocks.js";
import { editorHasBlockWithType } from "../../blocks/defaultBlockTypeGuards.js";
import {
  type DefaultBlockTypeItem,
  getDefaultBlockTypeItems,
} from "../../blocks/defaultBlockTypeItems.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
  isStyledTextInlineContent,
} from "../../schema/index.js";
import { formatKeyboardShortcut } from "../../util/browser.js";
import { FilePanelExtension } from "../FilePanel/FilePanel.js";
import { FormattingToolbarExtension } from "../FormattingToolbar/FormattingToolbar.js";
import { DefaultSuggestionItem } from "./DefaultSuggestionItem.js";
import { SuggestionMenu } from "./SuggestionMenu.js";

// Sets the editor's text cursor position to the next content editable block,
// so either a block with inline content or a table. If no such block exists
// after the current one, an empty paragraph is appended to the end of the
// document and the cursor is moved to it.
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
      // No content editable block exists after the current one, so we append
      // an empty paragraph to the end of the document and move the cursor to
      // it.
      const lastBlock = editor.document[editor.document.length - 1];
      const newBlock = editor.insertBlocks(
        [{ type: "paragraph" }],
        lastBlock,
        "after",
      )[0];
      editor.setTextCursorPosition(newBlock, "end");
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

  // The block types come from `getDefaultBlockTypeItems`, which the block
  // type select also uses. The slash menu places them in its own order.
  const blockTypes = new Map(
    getDefaultBlockTypeItems(editor).map((item) => [item.key, item]),
  );
  function pushBlockType(key: DefaultBlockTypeItem["key"], badge?: string) {
    const blockType = blockTypes.get(key);
    if (!blockType) {
      return;
    }
    items.push({
      onItemClick: () => {
        // The schema supports the block type (see `getDefaultBlockTypeItems`).
        insertOrUpdateBlockForSlashMenu(editor, {
          type: blockType.type,
          props: blockType.props,
        } as PartialBlock<BSchema, I, S>);
      },
      badge,
      key,
      ...editor.dictionary.slash_menu[key],
    });
  }

  pushBlockType("heading", formatKeyboardShortcut("Mod-Alt-1"));
  pushBlockType("heading_2", formatKeyboardShortcut("Mod-Alt-2"));
  pushBlockType("heading_3", formatKeyboardShortcut("Mod-Alt-3"));
  pushBlockType("quote");
  pushBlockType("toggle_list", formatKeyboardShortcut("Mod-Shift-6"));
  pushBlockType("numbered_list", formatKeyboardShortcut("Mod-Shift-7"));
  pushBlockType("bullet_list", formatKeyboardShortcut("Mod-Shift-8"));
  pushBlockType("check_list", formatKeyboardShortcut("Mod-Shift-9"));
  pushBlockType("paragraph", formatKeyboardShortcut("Mod-Alt-0"));

  if (editorHasBlockWithType(editor, "codeBlock")) {
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

  if (editorHasBlockWithType(editor, "divider")) {
    items.push({
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, { type: "divider" });
      },
      key: "divider",
      ...editor.dictionary.slash_menu.divider,
    });
  }

  if (editorHasBlockWithType(editor, "table")) {
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

  if (editorHasBlockWithType(editor, "image", { url: "string" })) {
    items.push({
      onItemClick: () => {
        const insertedBlock = insertOrUpdateBlockForSlashMenu(editor, {
          type: "image",
        });

        // Immediately open the file toolbar
        editor.getExtension(FilePanelExtension)?.showMenu(insertedBlock.id);
        // Immediately hide the formatting toolbar. This is only necessary for
        // when the `trailingBlock` editor option is set to `false` and the
        // inserted block is at the end of the document. Otherwise, the
        // selection moves to the next block with inline content.
        editor.getExtension(FormattingToolbarExtension)?.store.setState(false);
      },
      key: "image",
      ...editor.dictionary.slash_menu.image,
    });
  }

  if (editorHasBlockWithType(editor, "video", { url: "string" })) {
    items.push({
      onItemClick: () => {
        const insertedBlock = insertOrUpdateBlockForSlashMenu(editor, {
          type: "video",
        });

        // Immediately open the file toolbar
        editor.getExtension(FilePanelExtension)?.showMenu(insertedBlock.id);
        // Immediately hide the formatting toolbar. This is only necessary for
        // when the `trailingBlock` editor option is set to `false` and the
        // inserted block is at the end of the document. Otherwise, the
        // selection moves to the next block with inline content.
        editor.getExtension(FormattingToolbarExtension)?.store.setState(false);
      },
      key: "video",
      ...editor.dictionary.slash_menu.video,
    });
  }

  if (editorHasBlockWithType(editor, "audio", { url: "string" })) {
    items.push({
      onItemClick: () => {
        const insertedBlock = insertOrUpdateBlockForSlashMenu(editor, {
          type: "audio",
        });

        // Immediately open the file toolbar
        editor.getExtension(FilePanelExtension)?.showMenu(insertedBlock.id);
        // Immediately hide the formatting toolbar. This is only necessary for
        // when the `trailingBlock` editor option is set to `false` and the
        // inserted block is at the end of the document. Otherwise, the
        // selection moves to the next block with inline content.
        editor.getExtension(FormattingToolbarExtension)?.store.setState(false);
      },
      key: "audio",
      ...editor.dictionary.slash_menu.audio,
    });
  }

  if (editorHasBlockWithType(editor, "file", { url: "string" })) {
    items.push({
      onItemClick: () => {
        const insertedBlock = insertOrUpdateBlockForSlashMenu(editor, {
          type: "file",
        });

        // Immediately open the file toolbar
        editor.getExtension(FilePanelExtension)?.showMenu(insertedBlock.id);
        // Immediately hide the formatting toolbar. This is only necessary for
        // when the `trailingBlock` editor option is set to `false` and the
        // inserted block is at the end of the document. Otherwise, the
        // selection moves to the next block with inline content.
        editor.getExtension(FormattingToolbarExtension)?.store.setState(false);
      },
      key: "file",
      ...editor.dictionary.slash_menu.file,
    });
  }

  pushBlockType("toggle_heading");
  pushBlockType("toggle_heading_2");
  pushBlockType("toggle_heading_3");
  pushBlockType("heading_4", formatKeyboardShortcut("Mod-Alt-4"));
  pushBlockType("heading_5", formatKeyboardShortcut("Mod-Alt-5"));
  pushBlockType("heading_6", formatKeyboardShortcut("Mod-Alt-6"));

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
