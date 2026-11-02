import type { PartialBlock } from "@blocknote/core";

export const readOnlyLinkDocument: PartialBlock[] = [
  {
    type: "paragraph",
    content: [
      {
        type: "link",
        href: "https://www.blocknotejs.org/",
        content: "Documentation",
      },
    ],
  },
];

export const editorEscapeDocument: PartialBlock[] = [
  { type: "paragraph", content: "Editable text" },
];
