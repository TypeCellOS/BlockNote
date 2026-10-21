import type {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  PartialBlock,
  PartialInlineContentElement,
  Styles,
} from "@blocknote/core";

const styleExamples = {
  bold: { bold: true },
  italic: { italic: true },
  underline: { underline: true },
  strike: { strike: true },
  code: { code: true },
  textColor: { textColor: "blue" },
  backgroundColor: { backgroundColor: "yellow" },
} satisfies {
  [K in keyof DefaultStyleSchema]: Required<
    Pick<Styles<DefaultStyleSchema>, K>
  >;
};

const inlineExamples = {
  text: { type: "text", text: "Plain text. ", styles: {} },
  link: {
    type: "link",
    href: "https://www.blocknotejs.org/",
    content: "BlockNote documentation",
  },
} satisfies Record<
  keyof DefaultInlineContentSchema,
  PartialInlineContentElement<DefaultInlineContentSchema, DefaultStyleSchema>
>;

export const blockExamples = {
  paragraph: {
    type: "paragraph",
    content: [
      ...Object.values(inlineExamples),
      // Use separate text spans because code excludes other formatting marks.
      ...Object.entries(styleExamples).map(([name, styles]) => ({
        type: "text" as const,
        text: ` ${name}.`,
        styles,
      })),
    ],
  },
  heading: {
    type: "heading",
    props: { level: 1 },
    content: "Heading level one",
  },
  bulletListItem: { type: "bulletListItem", content: "Bullet list item" },
  numberedListItem: { type: "numberedListItem", content: "Numbered list item" },
  checkListItem: { type: "checkListItem", content: "Unchecked task" },
  toggleListItem: {
    type: "toggleListItem",
    content: "Toggle list item",
    children: [{ type: "paragraph", content: "Toggle child" }],
  },
  quote: { type: "quote", content: "Quoted text" },
  codeBlock: { type: "codeBlock", content: "const answer = 42;" },
  divider: { type: "divider" },
  table: {
    type: "table",
    content: {
      type: "tableContent",
      headerRows: 1,
      rows: [
        { cells: ["Name", "Description"] },
        { cells: ["Example", "Table cell"] },
      ],
    },
  },
  image: {
    type: "image",
    props: {
      url: "/image.svg",
      name: "Example image",
      caption: "Blue square",
      previewWidth: 100,
    },
  },
  audio: {
    type: "audio",
    props: { url: "/tone.wav", name: "tone.wav", caption: "A short test tone" },
  },
  video: {
    type: "video",
    props: {
      url: "/video.webm",
      name: "video.webm",
      caption: "A flower moving in the breeze",
      previewWidth: 200,
    },
  },
  file: { type: "file", props: { url: "/example.txt", name: "example.txt" } },
} satisfies { [K in keyof DefaultBlockSchema]: PartialBlock & { type: K } };

export const defaultSchemaDocument: PartialBlock[] = [
  { id: "start", type: "paragraph", content: "Start of document" },
  ...Object.entries(blockExamples).flatMap(([id, block]): PartialBlock[] => {
    const first = { ...block, id };
    // Adjacent items exercise list ownership/counts rather than only isolated
    // one-item lists. Switching types also exercises list boundaries.
    switch (block.type) {
      case "bulletListItem":
        return [
          {
            ...first,
            children: [
              {
                type: "paragraph",
                content: "Explanation inside the list item",
              },
              { type: "bulletListItem", content: "First nested bullet" },
              { type: "bulletListItem", content: "Second nested bullet" },
            ],
          },
          {
            id: `${id}-second`,
            type: block.type,
            content: "Second bullet list item",
          },
        ];
      case "numberedListItem":
        return [
          first,
          {
            id: `${id}-second`,
            type: block.type,
            content: "Second numbered list item",
          },
        ];
      case "checkListItem":
        return [
          first,
          { id: `${id}-second`, type: block.type, content: "Second task" },
        ];
      case "toggleListItem":
        return [
          first,
          {
            id: `${id}-second`,
            type: block.type,
            content: "Second toggle list item",
          },
        ];
      default:
        return [first];
    }
  }),
  ...[2, 3, 4, 5, 6].map((level) => ({
    id: `heading-${level}`,
    type: "heading" as const,
    props: { level },
    content: `Heading level ${level}`,
  })),
  {
    id: "toggle-heading",
    type: "heading",
    props: { level: 2, isToggleable: true },
    content: "Toggle heading",
    children: [{ type: "paragraph", content: "Heading child" }],
  },
  {
    id: "checked",
    type: "checkListItem",
    props: { checked: true },
    content: "Completed task",
  },
  { id: "end", type: "paragraph", content: "End of document" },
];
