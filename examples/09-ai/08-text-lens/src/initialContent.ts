import type { PartialBlock } from "@blocknote/core";

// The document has data that markdown and plain text do not show: text
// colors, background colors, underline, alignment, a paragraph in a
// paragraph, and the width of an image. A text write keeps this data.
export const initialContent: PartialBlock[] = [
  {
    type: "heading",
    props: { level: 1, textColor: "blue" },
    content: "Text lens",
  },
  {
    type: "paragraph",
    content: [
      { type: "text", text: "Edit the text on the right. ", styles: {} },
      { type: "text", text: "Your changes", styles: { underline: true } },
      {
        type: "text",
        text: " come back to this editor as suggestions. ",
        styles: {},
      },
      { type: "text", text: "Text colors", styles: { textColor: "red" } },
      { type: "text", text: " and ", styles: {} },
      {
        type: "text",
        text: "highlights",
        styles: { backgroundColor: "yellow" },
      },
      {
        type: "text",
        text: " stay, but markdown does not show them.",
        styles: {},
      },
    ],
  },
  {
    type: "paragraph",
    props: { textAlignment: "center", backgroundColor: "gray" },
    content: "This paragraph is centered and has a gray background.",
    children: [
      {
        type: "paragraph",
        content:
          "This paragraph is nested in the paragraph above. Markdown does not show this nesting.",
      },
    ],
  },
  {
    type: "bulletListItem",
    content: "Each block keeps its ID",
    children: [
      {
        type: "bulletListItem",
        content: "Nested list items stay nested",
      },
    ],
  },
  {
    type: "checkListItem",
    props: { checked: true },
    content: "A checked item",
  },
  {
    type: "image",
    props: {
      url: "https://placehold.co/332x322.jpg",
      caption: "This image has a custom width",
      previewWidth: 200,
    },
  },
  {
    type: "paragraph",
    content:
      "Change this sentence in the text. Then change a different block in the live editor, and change the text again.",
  },
];
