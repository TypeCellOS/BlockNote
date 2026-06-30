// AUTO-GENERATED FILE, DO NOT EDIT DIRECTLY.
// Generated from shared/testDocumentBlocks.ts — run `npm run gen` to update.
import type { PartialBlock } from "@blocknote/core";

/**
 * The shared example/test document, as partial blocks.
 *
 * This file is intentionally self-contained — it has only a type-only import
 * from `@blocknote/core` (no runtime imports) — so the example generator can
 * copy it verbatim into each exporter playground example and the examples stay
 * runnable on their own (e.g. opened directly in StackBlitz).
 *
 * It is the single source of truth for both the playground examples' editor
 * `initialContent` and the exporters' `testDocument` unit-test fixture.
 */
export const testDocumentBlocks: PartialBlock<any, any, any>[] = [
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Welcome to this ",
        styles: {
          italic: true,
        },
      },
      {
        type: "text",
        text: "demo 🙌!",
        styles: {
          italic: true,
          bold: true,
        },
      },
    ],
    children: [
      {
        type: "paragraph",
        content: "Hello World nested",
        children: [
          {
            type: "paragraph",
            content: "Hello World double nested",
          },
        ],
      },
    ],
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "This paragraph has a background color",
        styles: { bold: true },
      },
    ],
    props: {
      backgroundColor: "red",
    },
  },
  {
    type: "paragraph",
    content: "Paragraph",
  },
  {
    type: "heading",
    content: "Heading",
  },
  {
    type: "heading",
    content: "Heading right",
    props: {
      textAlignment: "right",
    },
  },
  {
    type: "heading",
    content: "Heading 2",
    props: { level: 2 },
  },
  {
    type: "heading",
    content: "Heading 3",
    props: { level: 3 },
  },
  {
    type: "heading",
    content: "Heading 4",
    props: { level: 4 },
  },
  {
    type: "heading",
    content: "Heading 5",
    props: { level: 5 },
  },
  {
    type: "heading",
    content: "Heading 6",
    props: { level: 6 },
  },
  {
    type: "paragraph",
    content: "Emojis: 😀 🎉 🚀 👍 👍🏽 🌍 🚶‍♀️",
  },
  {
    type: "paragraph",
    content: "Centered paragraph",
    props: {
      textAlignment: "center",
    },
  },
  {
    type: "paragraph",
    content:
      "justified paragraph. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",

    props: {
      textAlignment: "justify",
    },
  },
  { type: "pageBreak" },
  {
    type: "bulletListItem",
    content:
      "Bullet List Item. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    children: [
      {
        type: "bulletListItem",
        content:
          "Bullet List Item.  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
      },
      {
        type: "bulletListItem",
        content:
          "Bullet List Item right. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
        props: {
          textAlignment: "right",
        },
      },
      {
        type: "numberedListItem",
        content: "Numbered List Item 1",
      },
      {
        type: "numberedListItem",
        content: "Numbered List Item 2",
        children: [
          {
            type: "numberedListItem",
            content: "Numbered List Item Nested 1",
          },
          {
            type: "numberedListItem",
            content: "Numbered List Item Nested 2",
          },
          {
            type: "numberedListItem",
            content: "Numbered List Item Nested funky right",
            props: {
              textAlignment: "right",
              backgroundColor: "red",
              textColor: "blue",
            },
          },
          {
            type: "numberedListItem",
            content: "Numbered List Item Nested funky center",
            props: {
              textAlignment: "center",
              backgroundColor: "red",
              textColor: "blue",
            },
          },
        ],
      },
    ],
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
    type: "checkListItem",
    content: "Checked List Item",
    props: {
      checked: true,
    },
  },
  {
    type: "numberedListItem",
    content: "Numbered List Item starting at 5",
    props: {
      start: 5,
    },
  },
  {
    type: "numberedListItem",
    content: "Numbered List Item 6",
  },
  {
    type: "toggleListItem",
    content: "Toggle List Item",
    children: [
      {
        type: "paragraph",
        content: "Content nested inside the toggle list item.",
      },
      {
        type: "bulletListItem",
        content: "A nested bullet inside the toggle",
      },
    ],
  },
  {
    type: "heading",
    content: "Toggle Heading",
    props: {
      level: 2,
      isToggleable: true,
    },
    children: [
      {
        type: "paragraph",
        content: "Content nested inside the toggle heading.",
      },
    ],
  },
  {
    type: "table",
    content: {
      type: "tableContent",
      columnWidths: [200, undefined, undefined],
      rows: [
        {
          cells: ["Wide Cell", "Table Cell", "Table Cell"],
        },
        {
          cells: ["Wide Cell", "Table Cell", "Table Cell"],
        },
        {
          cells: ["Wide Cell", "Table Cell", "Table Cell"],
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
      url: "https://placehold.co/332x322.jpg",
      caption: "From https://placehold.co/332x322.jpg",
    },
  },
  {
    type: "image",
    props: {
      previewWidth: 200,
      url: "https://placehold.co/332x322.jpg",
      textAlignment: "right",
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
    type: "audio",
    props: {
      caption: "Audio file caption",
      name: "audio.mp3",
    },
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
        type: "text",
        text: "underlined",
        styles: { underline: true },
      },
      {
        type: "text",
        text: " ",
        styles: {},
      },
      {
        type: "text",
        text: "strikethrough",
        styles: { strike: true },
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
    type: "table",
    content: {
      type: "tableContent",
      headerRows: 1,
      rows: [
        {
          cells: ["Table Header 1", "Table Header 2", "Table Header 3"],
        },
        {
          cells: [
            "Table Cell 4",
            [
              {
                type: "text",
                text: "Table Cell Bold Colored 5",
                styles: {
                  bold: true,
                  textColor: "red",
                  backgroundColor: "blue",
                },
              },
            ],
            "Table Cell 6",
          ],
        },
        {
          cells: ["Table Cell 7", "Table Cell 8", "Table Cell 9"],
        },
      ],
    },
  },
  {
    type: "codeBlock",
    props: {
      language: "javascript",
    },
    content: `const helloWorld = (message) => {
  console.log("Hello World", message);
};`,
  },
  {
    type: "paragraph",
    content: [
      {
        type: "text",
        text: "Some inline code: ",
        styles: { bold: true },
      },
      {
        type: "text",
        text: "var foo = 'bar';",
        styles: { code: true },
      },
    ],
  },
  {
    type: "columnList",
    children: [
      {
        type: "column",
        props: { width: 0.8 },
        children: [
          { type: "paragraph", content: "This paragraph is in a column!" },
        ],
      },
      {
        type: "column",
        props: { width: 1.4 },
        children: [{ type: "heading", content: "So is this heading!" }],
      },
      {
        type: "column",
        props: { width: 0.8 },
        children: [
          {
            type: "paragraph",
            content: "You can have multiple blocks in a column too",
          },
          { type: "bulletListItem", content: "Block 1" },
          { type: "bulletListItem", content: "Block 2" },
          { type: "bulletListItem", content: "Block 3" },
        ],
      },
    ],
  },
  { type: "divider" },
  {
    type: "quote",
    content: "All those moments will be lost in time, like tears in rain.",
  },
];
