import {
  Block,
  DefaultBlockSchema,
  PartialBlock,
} from "../../blocks/defaultBlocks";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
  isStyledTextInlineContent,
} from "../../schema";
import { formatKeyboardShortcut } from "../../util/browser";
import { imageToolbarPluginKey } from "../ImageToolbar/ImageToolbarPlugin";

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

export function getDefaultSlashMenuItems() {
  return [
    {
      title: "Heading 1",
      // Unfortunately, we can't use a more specific BlockNoteEditor type here,
      // Typescript seems to get in the way there
      // This means that we don't have type checking for calling insertOrUpdateBlock etc. :(
      onItemClick: (editor: BlockNoteEditor<any, any, any>) => {
        insertOrUpdateBlock(editor, {
          type: "heading",
          props: { level: 1 },
        } satisfies PartialBlock<DefaultBlockSchema, any, any>);
      },
      subtext: "Used for a top-level heading",
      badge: formatKeyboardShortcut("Mod-Alt-1"),
      aliases: ["h", "heading1", "h1"],
      group: "Headings",
    },
    {
      title: "Heading 2",
      onItemClick: (editor: BlockNoteEditor<any, any, any>) => {
        insertOrUpdateBlock(editor, {
          type: "heading",
          props: { level: 2 },
        } satisfies PartialBlock<DefaultBlockSchema, any, any>);
      },
      subtext: "Used for key sections",
      badge: formatKeyboardShortcut("Mod-Alt-2"),
      aliases: ["h2", "heading2", "subheading"],
      group: "Headings",
    },
    {
      title: "Heading 3",
      onItemClick: (editor: BlockNoteEditor<any, any, any>) => {
        insertOrUpdateBlock(editor, {
          type: "heading",
          props: { level: 3 },
        } satisfies PartialBlock<DefaultBlockSchema, any, any>);
      },
      subtext: "Used for subsections and group headings",
      badge: formatKeyboardShortcut("Mod-Alt-3"),
      aliases: ["h3", "heading3", "subheading"],
      group: "Headings",
    },
    {
      title: "Numbered List",
      onItemClick: (editor: BlockNoteEditor<any, any, any>) => {
        insertOrUpdateBlock(editor, {
          type: "numberedListItem",
        } satisfies PartialBlock<DefaultBlockSchema, any, any>);
      },
      subtext: "Used to display a numbered list",
      badge: formatKeyboardShortcut("Mod-Shift-7"),
      aliases: ["ol", "li", "list", "numberedlist", "numbered list"],
      group: "Basic blocks",
    },
    {
      title: "Bullet List",
      onItemClick: (editor: BlockNoteEditor<any, any, any>) => {
        insertOrUpdateBlock(editor, {
          type: "bulletListItem",
        } satisfies PartialBlock<DefaultBlockSchema, any, any>);
      },
      subtext: "Used to display an unordered list",
      badge: formatKeyboardShortcut("Mod-Shift-8"),
      aliases: ["ul", "li", "list", "bulletlist", "bullet list"],
      group: "Basic blocks",
    },
    {
      title: "Paragraph",
      onItemClick: (editor: BlockNoteEditor<any, any, any>) => {
        insertOrUpdateBlock(editor, {
          type: "paragraph",
        } satisfies PartialBlock<DefaultBlockSchema, any, any>);
      },
      subtext: "Used for the body of your document",
      badge: formatKeyboardShortcut("Mod-Alt-0"),
      aliases: ["p", "paragraph"],
      group: "Basic blocks",
    },
    {
      title: "Table",
      onItemClick: (editor: BlockNoteEditor<any, any, any>) => {
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
        } satisfies PartialBlock<DefaultBlockSchema, any, any>);
      },
      subtext: "Used for for tables",
      aliases: ["table"],
      group: "Advanced",
      badge: undefined,
    },
    {
      title: "Image",
      onItemClick: (editor: BlockNoteEditor<any, any, any>) => {
        const insertedBlock = insertOrUpdateBlock(editor, {
          type: "image",
        } satisfies PartialBlock<DefaultBlockSchema, any, any>);

        // Immediately open the image toolbar
        editor._tiptapEditor.view.dispatch(
          editor._tiptapEditor.state.tr.setMeta(imageToolbarPluginKey, {
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
    },
  ] as const;
}

export function filterSuggestionItems<
  T extends { title: string; aliases?: readonly string[] }
>(items: T[], query: string) {
  return items.filter(
    ({ title, aliases }) =>
      title.toLowerCase().startsWith(query.toLowerCase()) ||
      (aliases &&
        aliases.filter((alias) =>
          alias.toLowerCase().startsWith(query.toLowerCase())
        ).length !== 0)
  );
}
