import { EditorTestCases } from "../index";

import { BlockNoteEditor } from "../../../editor/BlockNoteEditor";
import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
} from "../../../blocks/defaultBlocks";
import { uploadToTmpFilesDotOrg_DEV_ONLY } from "../../../blocks/ImageBlockContent/uploadToTmpFilesDotOrg_DEV_ONLY";

export const defaultSchemaTestCases: EditorTestCases<
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema
> = {
  name: "default schema",
  createEditor: () => {
    return BlockNoteEditor.create({
      uploadFile: uploadToTmpFilesDotOrg_DEV_ONLY,
    });
  },
  documents: [
    {
      name: "paragraph/empty",
      blocks: [
        {
          type: "paragraph",
        },
      ],
    },
    {
      name: "paragraph/basic",
      blocks: [
        {
          type: "paragraph",
          content: "Paragraph",
        },
      ],
    },
    {
      name: "paragraph/styled",
      blocks: [
        {
          type: "paragraph",
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
      name: "paragraph/nested",
      blocks: [
        {
          type: "paragraph",
          content: "Paragraph",
          children: [
            {
              type: "paragraph",
              content: "Nested Paragraph 1",
            },
            {
              type: "paragraph",
              content: "Nested Paragraph 2",
            },
          ],
        },
      ],
    },
    {
      name: "image/button",
      blocks: [
        {
          type: "image",
        },
      ],
    },
    {
      name: "image/basic",
      blocks: [
        {
          type: "image",
          props: {
            url: "exampleURL",
            caption: "Caption",
            width: 256,
          },
        },
      ],
    },
    {
      name: "image/nested",
      blocks: [
        {
          type: "image",
          props: {
            url: "exampleURL",
            caption: "Caption",
            width: 256,
          },
          children: [
            {
              type: "image",
              props: {
                url: "exampleURL",
                caption: "Caption",
                width: 256,
              },
            },
          ],
        },
      ],
    },
    {
      name: "link/basic",
      blocks: [
        {
          // id: UniqueID.options.generateID(),
          type: "paragraph",
          content: [
            {
              type: "link",
              href: "https://www.website.com",
              content: "Website",
            },
          ],
        },
      ],
    },
    {
      name: "link/styled",
      blocks: [
        {
          // id: UniqueID.options.generateID(),
          type: "paragraph",
          content: [
            {
              type: "link",
              href: "https://www.website.com",
              content: [
                {
                  type: "text",
                  text: "Web",
                  styles: {
                    bold: true,
                  },
                },
                {
                  type: "text",
                  text: "site",
                  styles: {},
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "link/adjacent",
      blocks: [
        {
          // id: UniqueID.options.generateID(),
          type: "paragraph",
          content: [
            {
              type: "link",
              href: "https://www.website.com",
              content: "Website",
            },
            {
              type: "link",
              href: "https://www.website2.com",
              content: "Website2",
            },
          ],
        },
      ],
    },
    {
      name: "hardbreak/basic",
      blocks: [
        {
          // id: UniqueID.options.generateID(),
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Text1\nText2",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      name: "hardbreak/multiple",
      blocks: [
        {
          // id: UniqueID.options.generateID(),
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Text1\nText2\nText3",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      name: "hardbreak/start",
      blocks: [
        {
          // id: UniqueID.options.generateID(),
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "\nText1",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      name: "hardbreak/end",
      blocks: [
        {
          // id: UniqueID.options.generateID(),
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Text1\n",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      name: "hardbreak/only",
      blocks: [
        {
          // id: UniqueID.options.generateID(),
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "\n",
              styles: {},
            },
          ],
        },
      ],
    },
    {
      name: "hardbreak/styles",
      blocks: [
        {
          // id: UniqueID.options.generateID(),
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Text1\n",
              styles: {},
            },
            {
              type: "text",
              text: "Text2",
              styles: { bold: true },
            },
          ],
        },
      ],
    },
    {
      name: "hardbreak/link",
      blocks: [
        {
          // id: UniqueID.options.generateID(),
          type: "paragraph",
          content: [
            {
              type: "link",
              href: "https://www.website.com",
              content: "Link1\nLink1",
            },
          ],
        },
      ],
    },
    {
      name: "hardbreak/between-links",
      blocks: [
        {
          // id: UniqueID.options.generateID(),
          type: "paragraph",
          content: [
            {
              type: "link",
              href: "https://www.website.com",
              content: "Link1\n",
            },
            {
              type: "link",
              href: "https://www.website2.com",
              content: "Link2",
            },
          ],
        },
      ],
    },
    {
      name: "complex/misc",
      blocks: [
        {
          // id: UniqueID.options.generateID(),
          type: "heading",
          props: {
            backgroundColor: "blue",
            textColor: "yellow",
            textAlignment: "right",
            level: 2,
          },
          content: [
            {
              type: "text",
              text: "Heading ",
              styles: {
                bold: true,
                underline: true,
              },
            },
            {
              type: "text",
              text: "2",
              styles: {
                italic: true,
                strike: true,
              },
            },
          ],
          children: [
            {
              // id: UniqueID.options.generateID(),
              type: "paragraph",
              props: {
                backgroundColor: "red",
              },
              content: "Paragraph",
              children: [],
            },
            {
              // id: UniqueID.options.generateID(),
              type: "bulletListItem",
              props: {},
            },
          ],
        },
      ],
    },
  ],
};
