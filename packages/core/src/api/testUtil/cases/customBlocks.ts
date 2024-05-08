import { EditorTestCases } from "../index";

import { uploadToTmpFilesDotOrg_DEV_ONLY } from "../../../blocks/FileBlockContent/uploadToTmpFilesDotOrg_DEV_ONLY";
import {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  defaultBlockSpecs,
} from "../../../blocks/defaultBlocks";
import { defaultProps } from "../../../blocks/defaultProps";
import { BlockNoteEditor } from "../../../editor/BlockNoteEditor";
import { BlockNoteSchema } from "../../../editor/BlockNoteSchema";
import { createBlockSpec } from "../../../schema/blocks/createSpec";
import { renderFile } from "../../../blocks/FileBlockContent/renderFile";
import { filePropSchema } from "../../../blocks/FileBlockContent/fileBlockConfig";
import { fileBlockImageExtension } from "../../../blocks/FileBlockContent/fileBlockExtensions";

// This is a modified version of the default file block that does not implement
// a `serialize` function. It's used to test if the custom serializer by default
// serializes custom blocks using their `render` function.
const SimpleFile = createBlockSpec(
  {
    type: "simpleFile" as const,
    propSchema: filePropSchema,
    content: "none",
  },
  {
    render: (block, editor) =>
      renderFile(block as any, editor as any, {
        image: fileBlockImageExtension,
      }),
  }
);

const CustomParagraph = createBlockSpec(
  {
    type: "customParagraph" as const,
    propSchema: defaultProps,
    content: "inline",
  },
  {
    render: () => {
      const paragraph = document.createElement("p");
      paragraph.className = "custom-paragraph";

      return {
        dom: paragraph,
        contentDOM: paragraph,
      };
    },
    toExternalHTML: () => {
      const paragraph = document.createElement("p");
      paragraph.className = "custom-paragraph";
      paragraph.innerHTML = "Hello World";

      return {
        dom: paragraph,
      };
    },
  }
);

const SimpleCustomParagraph = createBlockSpec(
  {
    type: "simpleCustomParagraph" as const,
    propSchema: defaultProps,
    content: "inline",
  },
  {
    render: () => {
      const paragraph = document.createElement("p");
      paragraph.className = "simple-custom-paragraph";

      return {
        dom: paragraph,
        contentDOM: paragraph,
      };
    },
  }
);

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    simpleFile: SimpleFile,
    customParagraph: CustomParagraph,
    simpleCustomParagraph: SimpleCustomParagraph,
  },
});

export const customBlocksTestCases: EditorTestCases<
  typeof schema.blockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema
> = {
  name: "custom blocks schema",
  createEditor: () => {
    return BlockNoteEditor.create({
      schema,
      uploadFile: uploadToTmpFilesDotOrg_DEV_ONLY,
    });
  },
  documents: [
    {
      name: "simpleFile/button",
      blocks: [
        {
          type: "simpleFile",
        },
      ],
    },
    {
      name: "simpleFile/basic",
      blocks: [
        {
          type: "simpleFile" as const,
          props: {
            url: "exampleURL",
            caption: "Caption",
            previewWidth: 256,
          } as const,
        },
      ],
    },
    {
      name: "simpleFile/nested",
      blocks: [
        {
          type: "simpleFile" as const,
          props: {
            url: "exampleURL",
            caption: "Caption",
            previewWidth: 256,
          } as const,
          children: [
            {
              type: "simpleFile" as const,
              props: {
                url: "exampleURL",
                caption: "Caption",
                previewWidth: 256,
              } as const,
            },
          ],
        },
      ],
    },
    {
      name: "customParagraph/basic",
      blocks: [
        {
          type: "customParagraph" as const,
          content: "Custom Paragraph",
        },
      ],
    },
    {
      name: "customParagraph/styled",
      blocks: [
        {
          type: "customParagraph" as const,
          props: {
            textAlignment: "center",
            textColor: "orange",
            backgroundColor: "pink",
          } as const,
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
      blocks: [
        {
          type: "customParagraph" as const,
          content: "Custom Paragraph",
          children: [
            {
              type: "customParagraph" as const,
              content: "Nested Custom Paragraph 1",
            },
            {
              type: "customParagraph" as const,
              content: "Nested Custom Paragraph 2",
            },
          ],
        },
      ],
    },
    {
      name: "simpleCustomParagraph/basic",
      blocks: [
        {
          type: "simpleCustomParagraph" as const,
          content: "Custom Paragraph",
        },
      ],
    },
    {
      name: "simpleCustomParagraph/styled",
      blocks: [
        {
          type: "simpleCustomParagraph" as const,
          props: {
            textAlignment: "center",
            textColor: "orange",
            backgroundColor: "pink",
          } as const,
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
      blocks: [
        {
          type: "simpleCustomParagraph" as const,
          content: "Custom Paragraph",
          children: [
            {
              type: "simpleCustomParagraph" as const,
              content: "Nested Custom Paragraph 1",
            },
            {
              type: "simpleCustomParagraph" as const,
              content: "Nested Custom Paragraph 2",
            },
          ],
        },
      ],
    },
  ],
};
