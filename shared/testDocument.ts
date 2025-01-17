import {
  BlockNoteSchema,
  defaultBlockSpecs,
  PageBreak,
  partialBlocksToBlocksForTesting,
} from "@blocknote/core";

export const testDocument = partialBlocksToBlocksForTesting(
  BlockNoteSchema.create({
    blockSpecs: { ...defaultBlockSpecs, pageBreak: PageBreak },
  }),
  [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Welcome to this",
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
        url: "https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg",
        caption:
          "From https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg",
      },
    },
    {
      type: "image",
      props: {
        previewWidth: 200,
        url: "https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg",
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
        rows: [
          {
            cells: ["Table Cell 1", "Table Cell 2", "Table Cell 3"],
          },
          {
            cells: [
              "Table Cell 4",
              [
                {
                  type: "text",
                  text: "Table Cell Bold 5",
                  styles: {
                    bold: true,
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
  ]
);
