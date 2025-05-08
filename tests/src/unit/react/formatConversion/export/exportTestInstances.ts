import { ExportTestCase } from "../../../shared/formatConversion/export/exportTestCase.js";
import {
  testExportBlockNoteHTML,
  testExportHTML,
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
