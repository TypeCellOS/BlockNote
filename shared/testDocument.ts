import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
  partialBlocksToBlocks,
} from "@blocknote/core";
import * as z from "zod/v4";

// @ts-ignore
const y = z; // needed to fix build

// TODO: Update tests that use this to the new format and remove
export const testDocument = partialBlocksToBlocks(
  BlockNoteSchema.create({
    blockSpecs: { ...defaultBlockSpecs, pageBreak: createPageBreakBlockSpec() },
  }),
  [
    {
      id: "test1",
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
          id: "test2",
          type: "paragraph",
          content: "Hello World nested",
          children: [
            {
              id: "test2child",
              type: "paragraph",
              content: "Hello World double nested",
            },
          ],
        },
      ],
    },
    {
      id: "test3",
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
      id: "test4",
      type: "paragraph",
      content: "Paragraph",
    },
    {
      id: "test5",
      type: "heading",
      content: "Heading",
    },
    {
      id: "test6",
      type: "heading",
      content: "Heading right",
      props: {
        textAlignment: "right",
      },
    },
    {
      id: "test7",
      type: "paragraph",
      content:
        "justified paragraph. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",

      props: {
        textAlignment: "justify",
      },
    },
    { id: "test8", type: "pageBreak" },
    {
      id: "test9",
      type: "bulletListItem",
      content:
        "Bullet List Item. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
      children: [
        {
          id: "test10",
          type: "bulletListItem",
          content:
            "Bullet List Item.  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
        },
        {
          id: "test11",
          type: "bulletListItem",
          content:
            "Bullet List Item right. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
          props: {
            textAlignment: "right",
          },
        },
        {
          id: "test12",
          type: "numberedListItem",
          content: "Numbered List Item 1",
        },
        {
          id: "test13",
          type: "numberedListItem",
          content: "Numbered List Item 2",
          children: [
            {
              id: "test14",
              type: "numberedListItem",
              content: "Numbered List Item Nested 1",
            },
            {
              id: "test15",
              type: "numberedListItem",
              content: "Numbered List Item Nested 2",
            },
            {
              id: "test16",
              type: "numberedListItem",
              content: "Numbered List Item Nested funky right",
              props: {
                textAlignment: "right",
                backgroundColor: "red",
                textColor: "blue",
              },
            },
            {
              id: "test17",
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
      id: "test18",
      type: "numberedListItem",
      content: "Numbered List Item",
    },
    {
      id: "test19",
      type: "checkListItem",
      content: "Check List Item",
    },
    {
      id: "test20",
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
      id: "test21",
      type: "file",
    },
    {
      id: "test22",
      type: "image",
      props: {
        url: "https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg",
        caption:
          "From https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg",
      },
    },
    {
      id: "test23",
      type: "image",
      props: {
        previewWidth: 200,
        url: "https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg",
        textAlignment: "right",
      },
    },
    {
      id: "test24",
      type: "video",
      props: {
        url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
        caption:
          "From https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
      },
    },
    {
      id: "test25",
      type: "audio",
      props: {
        url: "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
        caption:
          "From https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
      },
    },
    {
      id: "test26",
      type: "paragraph",
    },
    {
      id: "test27",
      type: "audio",
      props: {
        caption: "Audio file caption",
        name: "audio.mp3",
      },
    },
    {
      id: "test28",
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
      id: "test29",
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
      id: "test30",
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
      id: "test31",
      type: "codeBlock",
      props: {
        language: "javascript",
      },
      content: `const helloWorld = (message) => {
  console.log("Hello World", message);
};`,
    },
    {
      id: "test32",
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Some inline code: ",
          styles: { bold: true }
        },
        {
          type: "text",
          text: "var foo = 'bar';",
          styles: { code: true },
        },
      ]
    },
    { id: "test33",type: "divider" },
    {
      id: "test34",
      type: "quote",
      content: "All those moments will be lost in time, like tears in rain."
    }
  ],
);
