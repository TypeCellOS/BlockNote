import { ExportTestCase } from "@blocknote/core";

import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";

export const getExportTestCases = (
  conversionType: ExportTestCase<
    TestBlockSchema,
    TestInlineContentSchema,
    TestStyleSchema
  >["conversionType"]
): ExportTestCase<
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] => [
  {
    name: "reactFile/button",
    conversionType,
    content: [
      {
        type: "file",
      },
    ],
  },
  {
    name: "reactFile/basic",
    conversionType,
    content: [
      {
        type: "file",
        props: {
          name: "example",
          url: "exampleURL",
          caption: "Caption",
        },
      },
    ],
  },
  {
    name: "reactFile/noName",
    conversionType,
    content: [
      {
        type: "file",
        props: {
          url: "exampleURL",
          caption: "Caption",
        },
      },
    ],
  },
  {
    name: "reactFile/noCaption",
    conversionType,
    content: [
      {
        type: "file",
        props: {
          name: "example",
          url: "exampleURL",
        },
      },
    ],
  },
  {
    name: "reactFile/nested",
    conversionType,
    content: [
      {
        type: "file",
        props: {
          name: "example",
          url: "exampleURL",
          caption: "Caption",
        },
        children: [
          {
            type: "file",
            props: {
              name: "example",
              url: "exampleURL",
              caption: "Caption",
            },
          },
        ],
      },
    ],
  },
  // Because images need to fetch the download URL async, their internal HTML
  // is initially rendered without a `src` attribute, which is reflected in
  // the tests.
  {
    name: "reactImage/button",
    conversionType,
    content: [
      {
        type: "image",
      },
    ],
  },
  {
    name: "reactImage/basic",
    conversionType,
    content: [
      {
        type: "image",
        props: {
          name: "example",
          url: "exampleURL",
          caption: "Caption",
          previewWidth: 256,
        },
      },
    ],
  },
  {
    name: "reactImage/noName",
    conversionType,
    content: [
      {
        type: "image",
        props: {
          url: "exampleURL",
          caption: "Caption",
          previewWidth: 256,
        },
      },
    ],
  },
  {
    name: "reactImage/noCaption",
    conversionType,
    content: [
      {
        type: "image",
        props: {
          name: "example",
          url: "exampleURL",
          previewWidth: 256,
        },
      },
    ],
  },
  {
    name: "reactImage/noPreview",
    conversionType,
    content: [
      {
        type: "image",
        props: {
          name: "example",
          url: "exampleURL",
          caption: "Caption",
          showPreview: false,
          previewWidth: 256,
        },
      },
    ],
  },
  {
    name: "reactImage/nested",
    conversionType,
    content: [
      {
        type: "image",
        props: {
          name: "example",
          url: "exampleURL",
          caption: "Caption",
          previewWidth: 256,
        },
        children: [
          {
            type: "image",
            props: {
              name: "example",
              url: "exampleURL",
              caption: "Caption",
              previewWidth: 256,
            },
          },
        ],
      },
    ],
  },
  {
    name: "customParagraph/basic",
    conversionType,
    content: [
      {
        type: "customParagraph",
        content: "React Custom Paragraph",
      },
    ],
  },
  {
    name: "customParagraph/styled",
    conversionType,
    content: [
      {
        type: "customParagraph",
        props: {
          textAlignment: "center",
          textColor: "orange",
          backgroundColor: "pink",
        },
        content: [
          {
            type: "text",
            styles: {},
            text: "Plain ",
          },
          {
            type: "text",
            styles: {
              textColor: "red",
            },
            text: "Red Text ",
          },
          {
            type: "text",
            styles: {
              backgroundColor: "blue",
            },
            text: "Blue Background ",
          },
          {
            type: "text",
            styles: {
              textColor: "red",
              backgroundColor: "blue",
            },
            text: "Mixed Colors",
          },
        ],
      },
    ],
  },
  {
    name: "customParagraph/nested",
    conversionType,
    content: [
      {
        type: "customParagraph",
        content: "React Custom Paragraph",
        children: [
          {
            type: "customParagraph",
            content: "Nested React Custom Paragraph 1",
          },
          {
            type: "customParagraph",
            content: "Nested React Custom Paragraph 2",
          },
        ],
      },
    ],
  },
  {
    name: "customParagraph/lineBreaks",
    conversionType,
    content: [
      {
        type: "customParagraph",
        content: "Line 1\nLine 2",
      },
    ],
  },
  {
    name: "simpleCustomParagraph/basic",
    conversionType,
    content: [
      {
        type: "simpleCustomParagraph",
        content: "React Custom Paragraph",
      },
    ],
  },
  {
    name: "simpleCustomParagraph/styled",
    conversionType,
    content: [
      {
        type: "simpleCustomParagraph",
        props: {
          textAlignment: "center",
          textColor: "orange",
          backgroundColor: "pink",
        },
        content: [
          {
            type: "text",
            styles: {},
            text: "Plain ",
          },
          {
            type: "text",
            styles: {
              textColor: "red",
            },
            text: "Red Text ",
          },
          {
            type: "text",
            styles: {
              backgroundColor: "blue",
            },
            text: "Blue Background ",
          },
          {
            type: "text",
            styles: {
              textColor: "red",
              backgroundColor: "blue",
            },
            text: "Mixed Colors",
          },
        ],
      },
    ],
  },
  {
    name: "simpleCustomParagraph/nested",
    conversionType,
    content: [
      {
        type: "simpleCustomParagraph",
        content: "Custom React Paragraph",
        children: [
          {
            type: "simpleCustomParagraph",
            content: "Nested React Custom Paragraph 1",
          },
          {
            type: "simpleCustomParagraph",
            content: "Nested React Custom Paragraph 2",
          },
        ],
      },
    ],
  },
  {
    name: "contextParagraph/basic",
    conversionType,
    content: [
      {
        type: "contextParagraph",
        content: "React Context Paragraph",
      },
    ],
  },
  {
    name: "mention/basic",
    conversionType,
    content: [
      {
        type: "paragraph",
        content: [
          "I enjoy working with ",
          {
            type: "mention",
            props: {
              user: "Matthew",
            },
            content: undefined,
          } as const,
        ],
      },
    ],
  },
  {
    name: "tag/basic",
    conversionType,
    content: [
      {
        type: "paragraph",
        content: [
          "I love ",
          {
            type: "tag",
            // props: {},
            content: "BlockNote",
          } as const,
        ],
      },
    ],
  },
  {
    name: "small/basic",
    conversionType,
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "This is a small text",
            styles: {
              small: true,
            },
          },
        ],
      },
    ],
  },
  {
    name: "fontSize/basic",
    conversionType,
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "This is text with a custom fontSize",
            styles: {
              fontSize: "18px",
            },
          },
        ],
      },
    ],
  },
];
