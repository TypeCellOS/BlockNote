import { BaseSlashMenuItem } from "./BaseSlashMenuItem";
import { PartialBlock } from "../Blocks/api/blockTypes";
import { BlockNoteEditor } from "../../BlockNoteEditor";

function insertOrUpdateBlock(editor: BlockNoteEditor, block: PartialBlock) {
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

/**
 * An array containing commands for creating all default blocks.
 */
export const defaultSlashMenuItems: BaseSlashMenuItem[] = [
  // Command for creating a level 1 heading
  new BaseSlashMenuItem(
    "Heading",
    (editor) =>
      insertOrUpdateBlock(editor, {
        type: "heading",
        props: { level: "1" },
      }),
    ["h", "heading1", "h1"]
  ),

  // Command for creating a level 2 heading
  new BaseSlashMenuItem(
    "Heading 2",
    (editor) =>
      insertOrUpdateBlock(editor, {
        type: "heading",
        props: { level: "2" },
      }),
    ["h2", "heading2", "subheading"]
  ),

  // Command for creating a level 3 heading
  new BaseSlashMenuItem(
    "Heading 3",
    (editor) =>
      insertOrUpdateBlock(editor, {
        type: "heading",
        props: { level: "3" },
      }),
    ["h3", "heading3", "subheading"]
  ),

  // Command for creating an ordered list
  new BaseSlashMenuItem(
    "Numbered List",
    (editor) =>
      insertOrUpdateBlock(editor, {
        type: "numberedListItem",
      }),
    ["li", "list", "numberedlist", "numbered list"]
  ),

  // Command for creating a bullet list
  new BaseSlashMenuItem(
    "Bullet List",
    (editor) =>
      insertOrUpdateBlock(editor, {
        type: "bulletListItem",
      }),
    ["ul", "list", "bulletlist", "bullet list"]
  ),

  // Command for creating a paragraph (pretty useless)
  new BaseSlashMenuItem(
    "Paragraph",
    (editor) =>
      insertOrUpdateBlock(editor, {
        type: "paragraph",
      }),
    ["p"]
  ),

  //     replaceRangeWithNode(editor, range, node);

  //     return true;
  //   },
  //   ["ol", "orderedlist"],
  //   OrderedListIcon,
  //   "Used to display an ordered (enumerated) list item"
  // ),

  // Command for creating a blockquote
  // blockquote: new SlashCommand(
  //   "Block Quote",
  //   CommandGroup.BASIC_BLOCKS,
  //   (editor, range) => {
  //     const paragraph = editor.schema.node("paragraph");
  //     const node = editor.schema.node(
  //       "blockquote",
  //       { "block-id": uniqueId.generate() },
  //       paragraph
  //     );

  //     replaceRangeWithNode(editor, range, node);

  //     return true;
  //   },
  //   ["quote", "blockquote"],
  //   QuoteIcon,
  //   "Used to make a quote stand out",
  //   "Ctrl+Shift+B"
  // ),

  // Command for creating a horizontal rule
  // horizontalRule: new SlashCommand(
  //   "Horizontal Rule",
  //   CommandGroup.BASIC_BLOCKS,
  //   (editor, range) => {
  //     const node = editor.schema.node("horizontalRule", {
  //       "block-id": uniqueId.generate(),
  //     });

  //     // insert horizontal rule, create a new block after the horizontal rule if applicable
  //     // and put the cursor in the block after the horizontal rule.
  //     editor
  //       .chain()
  //       .focus()
  //       .replaceRangeAndUpdateSelection(range, node)
  //       .command(({ tr, dispatch }) => {
  //         if (dispatch) {
  //           // the node immediately after the cursor
  //           const nodeAfter = tr.selection.$to.nodeAfter;

  //           // the position of the cursor
  //           const cursorPos = tr.selection.$to.pos;

  //           // check if there is no node after the cursor (end of document)
  //           if (!nodeAfter) {
  //             // create a new block of the default type (probably paragraph) after the cursor
  //             const { parent } = tr.selection.$to;
  //             const node = parent.type.contentMatch.defaultType?.create();

  //             if (node) {
  //               tr.insert(cursorPos, node);
  //             }
  //           }

  //           // try to put the cursor at the start of the node directly after the inserted horizontal rule
  //           tr.doc.nodesBetween(cursorPos, cursorPos + 1, (node, pos) => {
  //             if (node.type.name !== "horizontalRule") {
  //               tr.setSelection(TextSelection.create(tr.doc, pos));
  //             }
  //           });
  //         }

  //         return true;
  //       })
  //       .scrollIntoView()
  //       .run();
  //     return true;
  //   },
  //   ["hr", "horizontalrule"],
  //   SeparatorIcon,
  //   "Used to separate sections with a horizontal line"
  // ),

  // Command for creating a table
  // table: new SlashCommand(
  //   "Table",
  //   CommandGroup.BASIC_BLOCKS,
  //   (editor, range) => {
  //     editor.chain().focus().deleteRange(range).run();
  //     // TODO: add blockid, pending https://github.com/ueberdosis/tiptap/pull/1469
  //     editor
  //       .chain()
  //       .focus()
  //       .insertTable({ rows: 1, cols: 2, withHeaderRow: false })
  //       .scrollIntoView()
  //       .run();
  //     return true;
  //   },
  //   ["table", "database"],
  //   TableIcon,
  //   "Used to create a simple table"
  // ),
];
