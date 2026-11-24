import type { ExportTestCase } from "./exportTestCase.js";
import type {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../support/reactTestSchema.js";

export type ReactExportCase = ExportTestCase<
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>;

export const exportCases: ReactExportCase[] = [
  {
    name: "reactFile/button",
    content: [
      {
        type: "file",
      },
    ],
  },
  {
    name: "reactFile/basic",
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
    content: [
      {
        type: "image",
      },
    ],
  },
  {
    name: "reactImage/basic",
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
    content: [
      {
        type: "customParagraph",
        content: "React Custom Paragraph",
      },
    ],
  },
  {
    name: "customParagraph/styled",
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
    content: [
      {
        type: "customParagraph",
        content: "Line 1\nLine 2",
      },
    ],
  },
  {
    name: "simpleCustomParagraph/basic",
    content: [
      {
        type: "simpleCustomParagraph",
        content: "React Custom Paragraph",
      },
    ],
  },
  {
    name: "simpleCustomParagraph/styled",
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
    content: [
      {
        type: "contextParagraph",
        content: "React Context Paragraph",
      },
    ],
  },
  {
    name: "mention/basic",
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
  {
    name: "mathBlock/basic",
    content: [
      {
        type: "mathBlock",
        content: "a^2 + b^2 = c^2",
      },
    ],
  },
  {
    name: "math/basic",
    content: [
      {
        type: "paragraph",
        content: [
          "The identity ",
          {
            type: "math",
            content: "e^{i\\pi} + 1 = 0",
          } as const,
          " is elegant.",
        ],
      },
    ],
  },
  {
    name: "diagram/basic",
    content: [
      {
        type: "diagram",
        content: "graph TD\n  A[Start] --> B[End]",
      },
    ],
  },
];

// Markdown export runs the external HTML through the markdown serializer:
// the diagram's fenced-code representation should come out as a ```mermaid
// fence, and math's MathML (via its LaTeX source annotation) as $$/$ spans.
export const markdownExportCases: ReactExportCase[] = [
  {
    name: "diagram/basic",
    content: [
      {
        type: "diagram",
        content: "graph TD\n  A[Start] --> B[End]",
      },
    ],
  },
  {
    name: "math/basic",
    content: [
      {
        type: "mathBlock",
        content: "a^2 + b^2 = c^2",
      },
    ],
  },
  // Nested multi-line blocks must indent every line (including the closing
  // delimiter) - an unindented line would end the list item. Toggle items
  // are the case where this occurs: external HTML flattens other list
  // items' non-list children to siblings, but keeps toggle children
  // nested.
  {
    name: "math/nested",
    content: [
      {
        type: "toggleListItem",
        content: "The theorem:",
        children: [
          {
            type: "mathBlock",
            content: "a^2 +\nb^2 = c^2",
          },
        ],
      },
    ],
  },
  {
    name: "codeBlock/nested",
    content: [
      {
        type: "toggleListItem",
        content: "The snippet:",
        children: [
          {
            type: "codeBlock",
            props: { language: "javascript" },
            content: "const a = 1;\n\nconst b = 2;",
          },
        ],
      },
    ],
  },
  {
    name: "inlineMath/basic",
    content: [
      {
        type: "paragraph",
        content: [
          "The identity ",
          {
            type: "math",
            content: "e^{i\\pi} + 1 = 0",
          } as const,
          " is elegant.",
        ],
      },
    ],
  },
];
