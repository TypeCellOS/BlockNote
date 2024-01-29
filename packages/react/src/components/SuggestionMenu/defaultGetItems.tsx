import {
  Block,
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  formatKeyboardShortcut,
  imageToolbarPluginKey,
  InlineContentSchema,
  isStyledTextInlineContent,
  PartialBlock,
  StyleSchema,
} from "@blocknote/core";
import {
  RiH1,
  RiH2,
  RiH3,
  RiImage2Fill,
  RiListOrdered,
  RiListUnordered,
  RiTable2,
  RiText,
} from "react-icons/ri";

import { SuggestionMenuItemProps } from "./SuggestionMenuItem";
import { SuggestionMenuLabelProps } from "./SuggestionMenuLabel";

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

// TODO: Not sure on the return type of this. I think it's nice that the items
//  can just be plugged as props into SuggestionMenuLabel and SuggestionMenuItem
//  components, but the labels make the keyboard selection code more complex.
// TODO: Also probably want an easier way of customizing the items list.
export async function defaultGetItems<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  query: string
): Promise<(SuggestionMenuItemProps | SuggestionMenuLabelProps)[]> {
  const groups: Record<string, SuggestionMenuItemProps[]> = {
    Headings: [
      {
        text: "Heading 1",
        subtext: "Used for a top-level heading",
        icon: <RiH1 size={18} />,
        badge: formatKeyboardShortcut("Mod-Alt-1"),
        aliases: ["h", "heading1", "h1"],
        executeItem: () => {
          insertOrUpdateBlock(editor, {
            type: "heading",
            props: { level: 1 },
          } as PartialBlock<BSchema, I, S>);
        },
      } satisfies SuggestionMenuItemProps,
      {
        text: "Heading 2",
        subtext: "Used for key sections",
        icon: <RiH2 size={18} />,
        badge: formatKeyboardShortcut("Mod-Alt-2"),
        aliases: ["h2", "heading2", "subheading"],
        executeItem: () => {
          insertOrUpdateBlock(editor, {
            type: "heading",
            props: { level: 2 },
          } as PartialBlock<BSchema, I, S>);
        },
      } satisfies SuggestionMenuItemProps,
      {
        text: "Heading 3",
        subtext: "Used for subsections and group headings",
        icon: <RiH3 size={18} />,
        badge: formatKeyboardShortcut("Mod-Alt-3"),
        aliases: ["h3", "heading3", "subheading"],
        executeItem: () => {
          insertOrUpdateBlock(editor, {
            type: "heading",
            props: { level: 3 },
          } as PartialBlock<BSchema, I, S>);
        },
      } satisfies SuggestionMenuItemProps,
    ],
    "Basic blocks": [
      {
        text: "Bullet List",
        subtext: "Used to display an unordered list",
        icon: <RiListUnordered size={18} />,
        badge: formatKeyboardShortcut("Mod-Alt-9"),
        aliases: ["ul", "li", "list", "bulletlist", "bullet list"],
        executeItem: () => {
          insertOrUpdateBlock(editor, { type: "bulletListItem" });
        },
      } satisfies SuggestionMenuItemProps,
      {
        text: "Numbered List",
        subtext: "Used to display a numbered list",
        icon: <RiListOrdered size={18} />,
        badge: formatKeyboardShortcut("Mod-Alt-7"),
        aliases: ["ol", "li", "list", "numberedlist", "numbered list"],
        executeItem: () => {
          insertOrUpdateBlock(editor, { type: "numberedListItem" });
        },
      } satisfies SuggestionMenuItemProps,
      {
        text: "Paragraph",
        subtext: "Used for the body of your document",
        icon: <RiText size={18} />,
        badge: formatKeyboardShortcut("Mod-Alt-0"),
        aliases: ["p", "paragraph"],
        executeItem: () => {
          insertOrUpdateBlock(editor, { type: "paragraph" });
        },
      } satisfies SuggestionMenuItemProps,
    ],
    Advanced: [
      {
        text: "Table",
        subtext: "Used for for tables",
        icon: <RiTable2 size={18} />,
        aliases: ["table"],
        executeItem: () => {
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
      } satisfies SuggestionMenuItemProps,
    ],
    Media: [
      {
        text: "Image",
        subtext: "Insert an image",
        icon: <RiImage2Fill />,
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
        executeItem: () => {
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
      } satisfies SuggestionMenuItemProps,
    ],
  };

  for (const [groupName, groupItems] of Object.entries(groups)) {
    groups[groupName] = groupItems.filter(
      ({ text, aliases }) =>
        text.toLowerCase().startsWith(query.toLowerCase()) ||
        (aliases &&
          aliases.filter((alias) =>
            alias.toLowerCase().startsWith(query.toLowerCase())
          ).length !== 0)
    );
    if (groups[groupName].length === 0) {
      delete groups[groupName];
    }
  }

  // For testing async
  // return new Promise((resolve) => {
  //   setTimeout(() => {
  //     console.log("return items");
  //     resolve(
  //       Object.entries(groups).flatMap(([groupName, groupItems]) => [
  //         {
  //           label: groupName,
  //         } satisfies SuggestionMenuLabelProps,
  //         ...groupItems,
  //       ])
  //     );
  //   }, 1000);
  // });

  return Object.entries(groups).flatMap(([groupName, groupItems]) => [
    {
      label: groupName,
    } satisfies SuggestionMenuLabelProps,
    ...groupItems,
  ]);
}
