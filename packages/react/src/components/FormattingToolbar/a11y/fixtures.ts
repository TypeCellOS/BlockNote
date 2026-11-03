import type { PartialBlock } from "@blocknote/core";

// The middle paragraph is selected; its neighbours provide navigation context.
export const toolbarDocument: PartialBlock[] = [
  { id: "preceding", type: "paragraph", content: "Preceding paragraph" },
  { id: "format", type: "paragraph", content: "Format this text" },
  { id: "following", type: "paragraph", content: "Following paragraph" },
];

export const nestedToolbarDocument: PartialBlock[] = [
  {
    id: "preceding",
    type: "paragraph",
    content: "Preceding paragraph",
    children: [
      { id: "format", type: "paragraph", content: "Format this text" },
    ],
  },
];
