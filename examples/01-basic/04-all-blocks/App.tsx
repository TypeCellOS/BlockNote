import {
  BlockNoteSchema,
  combineByGroup,
  filterSuggestionItems,
  locales,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
} from "@blocknote/react";
import {
  getMultiColumnSlashMenuItems,
  multiColumnDropCursor,
  locales as multiColumnLocales,
  withMultiColumn,
} from "@blocknote/xl-multi-column";
import { useMemo } from "react";
export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    schema: withMultiColumn(BlockNoteSchema.create()),
    dropCursor: multiColumnDropCursor,
    dictionary: {
      ...locales.en,
      multi_column: multiColumnLocales.en,
    },
    initialContent: [
      {
        type: "paragraph",
        content: "Welcome to this demo!",
      },
      {
        type: "paragraph",
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Blocks:",
            styles: { bold: true },
          },
        ],
      },
      {
        type: "paragraph",
        content: "Paragraph",
      },
      {
        type: "columnList",
        children: [
          {
            type: "column",
            props: {
              width: 0.8,
            },
            children: [
              {
                type: "paragraph",
                content: "Hello to the left!",
              },
            ],
          },
          {
            type: "column",
            props: {
              width: 1.2,
            },
            children: [
              {
                type: "paragraph",
                content: "Hello to the right!",
              },
            ],
          },
        ],
      },
      {
        type: "heading",
        content: "Heading",
      },
      {
        type: "bulletListItem",
        content: "Bullet List Item",
      },
      {
        type: "numberedListItem",
        content: "Numbered List Item",
      },
      {
        type: "checkListItem",
        content: "Check List Item",
      },
      {
        type: "codeBlock",
        props: { language: "javascript" },
        content: "console.log('Hello, world!');",
      },
      {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            {
              cells: ["Table Cell", "Table Cell", "Table Cell"],
            },
            {
              cells: ["Table Cell", "Table Cell", "Table Cell"],
            },
            {
              cells: ["Table Cell", "Table Cell", "Table Cell"],
            },
          ],
        },
      },
      {
        type: "file",
      },
      {
        type: "image",
        props: {
          url: "https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg",
          caption:
            "From https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg",
        },
      },
      {
        type: "video",
        props: {
          url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
          caption:
            "From https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
        },
      },
      {
        type: "audio",
        props: {
          url: "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
          caption:
            "From https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
        },
      },
      {
        type: "paragraph",
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Inline Content:",
            styles: { bold: true },
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Styled Text",
            styles: {
              bold: true,
              italic: true,
              textColor: "red",
              backgroundColor: "blue",
            },
          },
          {
            type: "text",
            text: " ",
            styles: {},
          },
          {
            type: "link",
            content: "Link",
            href: "https://www.blocknotejs.org",
          },
        ],
      },
      {
        type: "paragraph",
      },
    ],
  });

  const slashMenuItems = useMemo(() => {
    return combineByGroup(
      getDefaultReactSlashMenuItems(editor),
      getMultiColumnSlashMenuItems(editor)
    );
  }, [editor]);

  // Renders the editor instance using a React component.
  return (
    <BlockNoteView editor={editor} slashMenu={false}>
      <SuggestionMenuController
        triggerCharacter={"/"}
        getItems={async (query) => filterSuggestionItems(slashMenuItems, query)}
      />
    </BlockNoteView>
  );
}
