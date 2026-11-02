import type { PartialBlock } from "@blocknote/core";

export const toggleHeadingDocument: PartialBlock[] = [
  {
    id: "read-only-toggle-heading",
    type: "heading",
    props: { level: 2, isToggleable: true },
    content: "Details",
    children: [{ type: "paragraph", content: "Nested read-only content" }],
  },
];
