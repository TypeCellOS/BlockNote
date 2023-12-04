import { EditorTestCases } from "../index";

import { BlockNoteEditor } from "../../../editor/BlockNoteEditor";
import {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  defaultBlockSpecs,
} from "../../../blocks/defaultBlocks";
import { defaultProps } from "../../../blocks/defaultProps";
import {
  imagePropSchema,
  renderImage,
} from "../../../blocks/ImageBlockContent/ImageBlockContent";
import { uploadToTmpFilesDotOrg_DEV_ONLY } from "../../../blocks/ImageBlockContent/uploadToTmpFilesDotOrg_DEV_ONLY";
import { createBlockSpec } from "../../../schema/blocks/createSpec";
import { BlockSchemaFromSpecs, BlockSpecs } from "../../../schema/blocks/types";

// This is a modified version of the default image block that does not implement
// a `serialize` function. It's used to test if the custom serializer by default
// serializes custom blocks using their `render` function.
const SimpleImage = createBlockSpec(
  {
    type: "simpleImage" as const,
    propSchema: imagePropSchema,
    content: "none",
  },
  { render: renderImage as any }
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

const customSpecs = {
  ...defaultBlockSpecs,
  simpleImage: SimpleImage,
  customParagraph: CustomParagraph,
  simpleCustomParagraph: SimpleCustomParagraph,
} satisfies BlockSpecs;

export const customBlocksTestCases: EditorTestCases<
  BlockSchemaFromSpecs<typeof customSpecs>,
  DefaultInlineContentSchema,
  DefaultStyleSchema
> = {
  name: "custom blocks schema",
  createEditor: () => {
    return BlockNoteEditor.create({
      blockSpecs: customSpecs,
      uploadFile: uploadToTmpFilesDotOrg_DEV_ONLY,
    });
  },
  documents: [
    {
      name: "simpleImage/button",
      blocks: [
        {
          type: "simpleImage" as const,
        },
      ],
    },
    {
      name: "simpleImage/basic",
      blocks: [
        {
          type: "simpleImage" as const,
          props: {
            url: "exampleURL",
            caption: "Caption",
            width: 256,
          } as const,
        },
      ],
    },
    {
      name: "simpleImage/nested",
      blocks: [
        {
          type: "simpleImage" as const,
          props: {
            url: "exampleURL",
            caption: "Caption",
            width: 256,
          } as const,
          children: [
            {
              type: "simpleImage" as const,
              props: {
                url: "exampleURL",
                caption: "Caption",
                width: 256,
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
