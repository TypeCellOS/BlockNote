import type { PartialBlock } from "@blocknote/core";

/** A short document with some spelling mistakes, and with a color that markdown does not show. */
export const initialContent: PartialBlock[] = [
  {
    type: "heading",
    props: { level: 1 },
    content: "Open source sofware",
  },
  {
    type: "paragraph",
    props: { textColor: "blue" },
    content:
      "Open source software refers to computer programms whose source code is made availble to the public, allowing anyone to view, modify, and distribute the code.",
  },
  {
    type: "paragraph",
    content:
      "This model stands in contrast to proprietary software, where the source code is kept secret and only the original creators have the right to make changes.",
  },
  {
    type: "heading",
    props: { level: 2 },
    content: "Benefits",
  },
  {
    type: "bulletListItem",
    content: "Users control their own technology.",
  },
  {
    type: "bulletListItem",
    content: "Anyone can inspect the code for security problems.",
  },
  {
    type: "paragraph",
    content:
      "Open development also helps innovation: developers build on existing projects and share improvements.",
  },
];
