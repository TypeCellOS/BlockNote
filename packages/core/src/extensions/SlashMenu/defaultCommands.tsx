import { RiH1, RiH2, RiH3, RiText, RiBold, RiUnderline } from "react-icons/ri";
import boldChain from "./CommandChains/boldChain";
import headingChain from "./CommandChains/headingChain";
import paragraphChain from "./CommandChains/paragraphChain";
import underlineChain from "./CommandChains/underlineChain";
import { SlashMenuGroups, SlashMenuItem } from "./SlashMenuItem";

/**
 * An array containing commands for creating all default blocks.
 */
const defaultCommands: { [key: string]: SlashMenuItem } = {
  // Command for creating a level 1 heading
  heading: new SlashMenuItem(
    "Heading",
    SlashMenuGroups.HEADINGS,
    headingChain(1),
    ["h", "heading1", "h1"],
    RiH1,
    "Used for a top-level heading",
    "Ctrl+Alt+1"
  ),

  // Command for creating a level 2 heading
  heading2: new SlashMenuItem(
    "Heading 2",
    SlashMenuGroups.HEADINGS,
    headingChain(2),
    ["h2", "heading2", "subheading"],
    RiH2,
    "Used for key sections",
    "Ctrl+Alt+2"
  ),

  // Command for creating a level 3 heading
  heading3: new SlashMenuItem(
    "Heading 3",
    SlashMenuGroups.HEADINGS,
    headingChain(3),
    ["h3", "heading3", "subsubheading"],
    RiH3,
    "Used for subsections and group headings",
    "Ctrl+Alt+3"
  ),

  // Command for creating a paragraph (pretty useless)
  paragraph: new SlashMenuItem(
    "Paragraph",
    SlashMenuGroups.BASIC_BLOCKS,
    paragraphChain(),
    ["p"],
    RiText,
    "Used for the body of your document"
  ),

  bold: new SlashMenuItem(
    "Bold",
    SlashMenuGroups.INLINE,
    boldChain(),
    ["b", "bold", "strong"],
    RiBold,
    "Used for emphasizing text",
    "Ctrl+Alt+B"
  ),

  underline: new SlashMenuItem(
    "Underline",
    SlashMenuGroups.INLINE,
    underlineChain(),
    ["u", "underline"],
    RiUnderline,
    "Used for underlining text",
    "Ctrl+Alt+U"
  ),

  // Command for creating a bullet list
  // bulletlist: new SlashCommand(
  //   "Bullet List",
  //   CommandGroup.BASIC_BLOCKS,
  //   (editor, range) => {
  //     const paragraph = editor.schema.node("paragraph");
  //     const listItem = editor.schema.node(
  //       "listItem",
  //       { "block-id": uniqueId.generate() },
  //       paragraph
  //     );
  //     const node = editor.schema.node(
  //       "bulletList",
  //       { "block-id": uniqueId.generate() },
  //       listItem
  //     );

  //     replaceRangeWithNode(editor, range, node);

  //     return true;
  //   },
  //   ["ul", "list", "bulletlist"],
  //   UnorderedListIcon,
  //   "Used to display an unordered list item"
  // ),

  // Command for creating an ordered list
  // orderedlist: new SlashCommand(
  //   "Ordered List",
  //   CommandGroup.BASIC_BLOCKS,
  //   (editor, range) => {
  //     const paragraph = editor.schema.node("paragraph");
  //     const listItem = editor.schema.node(
  //       "listItem",
  //       { "block-id": uniqueId.generate() },
  //       paragraph
  //     );
  //     const node = editor.schema.node(
  //       "orderedList",
  //       { "block-id": uniqueId.generate() },
  //       listItem
  //     );

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
};

export default defaultCommands;
