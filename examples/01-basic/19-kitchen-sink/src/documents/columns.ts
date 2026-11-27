import type { KitchenSinkBlock } from "../schema.js";

export const columns: KitchenSinkBlock[] = [
  {
    type: "paragraph",
    content: "2 columns",
  },
  {
    type: "columnList",
    children: [
      {
        type: "column",
        props: {
          width: 2,
        },
        children: [
          {
            type: "heading",
            props: {
              level: 2,
            },
            content: "Column 1",
          },
          {
            type: "paragraph",
            content: "Resize the boundary or drag blocks between columns.",
          },
          {
            type: "bulletListItem",
            content: "Nested content",
            children: [
              {
                type: "paragraph",
                content: "A child block",
              },
            ],
          },
        ],
      },
      {
        type: "column",
        props: {
          width: 1,
        },
        children: [
          {
            type: "heading",
            props: {
              level: 2,
            },
            content: "Column 2",
          },
          {
            type: "paragraph",
            content: "Resize the boundary or drag blocks between columns.",
          },
          {
            type: "bulletListItem",
            content: "Nested content",
            children: [
              {
                type: "paragraph",
                content: "A child block",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    type: "paragraph",
    content: "3 columns",
  },
  {
    type: "columnList",
    children: [
      {
        type: "column",
        props: {
          width: 2,
        },
        children: [
          {
            type: "heading",
            props: {
              level: 2,
            },
            content: "Column 1",
          },
          {
            type: "paragraph",
            content: "Resize the boundary or drag blocks between columns.",
          },
          {
            type: "bulletListItem",
            content: "Nested content",
            children: [
              {
                type: "paragraph",
                content: "A child block",
              },
            ],
          },
        ],
      },
      {
        type: "column",
        props: {
          width: 1,
        },
        children: [
          {
            type: "heading",
            props: {
              level: 2,
            },
            content: "Column 2",
          },
          {
            type: "paragraph",
            content: "Resize the boundary or drag blocks between columns.",
          },
          {
            type: "bulletListItem",
            content: "Nested content",
            children: [
              {
                type: "paragraph",
                content: "A child block",
              },
            ],
          },
        ],
      },
      {
        type: "column",
        props: {
          width: 1,
        },
        children: [
          {
            type: "heading",
            props: {
              level: 2,
            },
            content: "Column 3",
          },
          {
            type: "paragraph",
            content: "Resize the boundary or drag blocks between columns.",
          },
          {
            type: "bulletListItem",
            content: "Nested content",
            children: [
              {
                type: "paragraph",
                content: "A child block",
              },
            ],
          },
        ],
      },
    ],
  },
];
