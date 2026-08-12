import { ExportTestCase } from "../../../shared/formatConversion/export/exportTestCase.js";
import {
  testExportBlockNoteHTML,
  testExportHTML,
  testExportMarkdown,
} from "../../../shared/formatConversion/export/exportTestExecutors.js";
import { TestInstance } from "../../../types.js";
import {
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema,
} from "../../testSchema.js";

export const exportTestInstancesBlockNoteHTML: TestInstance<
  ExportTestCase<TestBlockSchema, TestInlineContentSchema, TestStyleSchema>,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = [
  {
    testCase: {
      name: "reactFile/button",
      content: [
        {
          type: "file",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  // Because images need to fetch the download URL async, their internal HTML
  // is initially rendered without a `src` attribute, which is reflected in
  // the tests.
  {
    testCase: {
      name: "reactImage/button",
      content: [
        {
          type: "image",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "customParagraph/basic",
      content: [
        {
          type: "customParagraph",
          content: "React Custom Paragraph",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "customParagraph/lineBreaks",
      content: [
        {
          type: "customParagraph",
          content: "Line 1\nLine 2",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "simpleCustomParagraph/basic",
      content: [
        {
          type: "simpleCustomParagraph",
          content: "React Custom Paragraph",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "contextParagraph/basic",
      content: [
        {
          type: "contextParagraph",
          content: "React Context Paragraph",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "mathBlock/basic",
      content: [
        {
          type: "mathBlock",
          content: "a^2 + b^2 = c^2",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
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
    executeTest: testExportBlockNoteHTML,
  },
  {
    testCase: {
      name: "diagram/basic",
      content: [
        {
          type: "diagram",
          content: "graph TD\n  A[Start] --> B[End]",
        },
      ],
    },
    executeTest: testExportBlockNoteHTML,
  },
];

export const exportTestInstancesHTML: TestInstance<
  ExportTestCase<TestBlockSchema, TestInlineContentSchema, TestStyleSchema>,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = exportTestInstancesBlockNoteHTML.map(({ testCase }) => ({
  testCase,
  executeTest: testExportHTML,
}));

// Markdown export runs the external HTML through the markdown serializer:
// the diagram's fenced-code representation should come out as a ```mermaid
// fence, and math's MathML (via its LaTeX source annotation) as $$/$ spans.
export const exportTestInstancesMarkdown: TestInstance<
  ExportTestCase<TestBlockSchema, TestInlineContentSchema, TestStyleSchema>,
  TestBlockSchema,
  TestInlineContentSchema,
  TestStyleSchema
>[] = [
  {
    testCase: {
      name: "diagram/basic",
      content: [
        {
          type: "diagram",
          content: "graph TD\n  A[Start] --> B[End]",
        },
      ],
    },
    executeTest: testExportMarkdown,
  },
  {
    testCase: {
      name: "math/basic",
      content: [
        {
          type: "mathBlock",
          content: "a^2 + b^2 = c^2",
        },
      ],
    },
    executeTest: testExportMarkdown,
  },
  {
    // Nested multi-line blocks must indent every line (including the closing
    // delimiter) - an unindented line would end the list item. Toggle items
    // are the case where this occurs: external HTML flattens other list
    // items' non-list children to siblings, but keeps toggle children
    // nested.
    testCase: {
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
    executeTest: testExportMarkdown,
  },
  {
    testCase: {
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
    executeTest: testExportMarkdown,
  },
  {
    testCase: {
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
    executeTest: testExportMarkdown,
  },
];
