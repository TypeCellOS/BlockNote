import type { KitchenSinkBlock } from "../schema.js";

export const standardBlocks: KitchenSinkBlock[] = [
  {
    type: "paragraph",
    content: "Paragraph",
  },
  {
    type: "paragraph",
    props: {
      textColor: "blue",
      backgroundColor: "yellow",
      textAlignment: "right",
    },
    content: "Paragraph with markup",
  },
  {
    type: "heading",
    props: {
      level: 1,
    },
    content: "Heading 1",
  },
  {
    type: "heading",
    props: {
      level: 2,
    },
    content: "Heading 2",
  },
  {
    type: "heading",
    props: {
      level: 3,
    },
    content: "Heading 3",
  },
  {
    type: "heading",
    props: {
      level: 4,
    },
    content: "Heading 4",
  },
  {
    type: "heading",
    props: {
      level: 5,
    },
    content: "Heading 5",
  },
  {
    type: "heading",
    props: {
      level: 6,
    },
    content: "Heading 6",
  },
  {
    type: "heading",
    props: {
      isToggleable: true,
    },
    content: "Collapsible heading",
    children: [
      {
        type: "paragraph",
        content: "Nested content",
      },
    ],
  },
  {
    type: "heading",
    props: {
      isToggleable: true,
    },
    content: "Empty collapsible heading",
  },
  {
    type: "quote",
    content: "Quote",
  },
  {
    type: "bulletListItem",
    content: "Bulleted list item",
    children: [
      {
        type: "paragraph",
        content: "Nested child",
      },
      {
        type: "bulletListItem",
        content: "Nested list",
        children: [
          {
            type: "paragraph",
            content: "Second nesting level",
          },
        ],
      },
    ],
  },
  {
    type: "numberedListItem",
    content: "Numbered list item",
  },
  {
    type: "checkListItem",
    content: "Unchecked checklist item",
  },
  {
    type: "checkListItem",
    props: {
      checked: true,
    },
    content: "Checked checklist item",
  },
  {
    type: "toggleListItem",
    content: "Toggle list item",
    children: [
      {
        type: "paragraph",
        content: "Nested content",
      },
    ],
  },
  {
    type: "toggleListItem",
    content: "Empty toggle list item",
  },
  {
    type: "codeBlock",
    content: "Plain text code block",
  },
  {
    type: "codeBlock",
    props: {
      language: "javascript",
    },
    content: 'function greet() {\n  return "Hello, world!";\n}',
  },
  {
    type: "table",
    content: {
      type: "tableContent",
      rows: [
        {
          cells: ["A", "B"],
        },
        {
          cells: ["C", "D"],
        },
      ],
    },
  },
  {
    type: "paragraph",
    content: "Divider",
  },
  {
    type: "divider",
  },
  {
    type: "paragraph",
    content: "Files",
  },
  {
    type: "file",
  },
  {
    type: "file",
    props: {
      url: "data:text/plain,Example%20attachment",
      name: "Example attachment.txt",
      caption: "Example attachment.txt caption",
    },
  },
  {
    type: "paragraph",
    content: "Images",
  },
  {
    type: "image",
  },
  {
    type: "image",
    props: {
      url: "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22320%22%20height%3D%22180%22%3E%3Crect%20width%3D%22320%22%20height%3D%22180%22%20fill%3D%22%23cfedff%22%2F%3E%3Ccircle%20cx%3D%22160%22%20cy%3D%2290%22%20r%3D%2260%22%20fill%3D%22%23006d9a%22%2F%3E%3C%2Fsvg%3E",
      name: "Blue circle on a pale blue background",
      caption: "Blue circle on a pale blue background caption",
      previewWidth: 280,
    },
  },
  {
    type: "paragraph",
    content: "Videos",
  },
  {
    type: "video",
  },
  {
    type: "video",
    props: {
      url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
      name: "Flower video",
      caption: "Flower video caption",
      previewWidth: 280,
    },
  },
  {
    type: "paragraph",
    content: "Audio",
  },
  {
    type: "audio",
  },
  {
    type: "audio",
    props: {
      url: "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
      name: "Tyrannosaurus roar",
      caption: "Tyrannosaurus roar caption",
    },
  },
  {
    type: "paragraph",
    content: "Page break",
  },
  {
    type: "pageBreak",
  },
];
