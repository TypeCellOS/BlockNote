import { EditorTestCases } from "../index";

import { BlockNoteEditor } from "../../../editor/BlockNoteEditor";
import {
  DefaultBlockSchema,
  DefaultStyleSchema,
  defaultInlineContentSpecs,
} from "../../../blocks/defaultBlocks";
import { uploadToTmpFilesDotOrg_DEV_ONLY } from "../../../blocks/ImageBlockContent/uploadToTmpFilesDotOrg_DEV_ONLY";
import { createInlineContentSpec } from "../../../schema/inlineContent/createSpec";
import {
  InlineContentSchemaFromSpecs,
  InlineContentSpecs,
} from "../../../schema/inlineContent/types";

const mention = createInlineContentSpec(
  {
    type: "mention" as const,
    propSchema: {
      user: {
        default: "",
      },
    },
    content: "none",
  },
  {
    render: (ic) => {
      const dom = document.createElement("span");
      dom.appendChild(document.createTextNode("@" + ic.props.user));

      return {
        dom,
      };
    },
  }
);

const tag = createInlineContentSpec(
  {
    type: "tag" as const,
    propSchema: {},
    content: "styled",
  },
  {
    render: () => {
      const dom = document.createElement("span");
      dom.textContent = "#";

      const contentDOM = document.createElement("span");
      dom.appendChild(contentDOM);

      return {
        dom,
        contentDOM,
      };
    },
  }
);

const customInlineContent = {
  ...defaultInlineContentSpecs,
  mention,
  tag,
} satisfies InlineContentSpecs;

export const customInlineContentTestCases: EditorTestCases<
  DefaultBlockSchema,
  InlineContentSchemaFromSpecs<typeof customInlineContent>,
  DefaultStyleSchema
> = {
  name: "custom inline content schema",
  createEditor: () => {
    return BlockNoteEditor.create({
      uploadFile: uploadToTmpFilesDotOrg_DEV_ONLY,
      inlineContentSpecs: customInlineContent,
    });
  },
  documents: [
    {
      name: "mention/basic",
      blocks: [
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
            },
          ],
        },
      ],
    },
    {
      name: "tag/basic",
      blocks: [
        {
          type: "paragraph",
          content: [
            "I love ",
            {
              type: "tag",
              // props: {},
              content: "BlockNote",
            },
          ],
        },
      ],
    },
  ],
};
