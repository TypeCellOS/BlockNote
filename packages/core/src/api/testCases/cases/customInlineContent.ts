import { EditorTestCases } from "..";
import {
  DefaultBlockSchema,
  DefaultStyleSchema,
  InlineContentSchemaFromSpecs,
  InlineContentSpecs,
  uploadToTmpFilesDotOrg_DEV_ONLY,
} from "../../..";
import { BlockNoteEditor } from "../../../BlockNoteEditor";
import { createInlineContentSpec } from "../../../extensions/Blocks/api/inlineContent/createSpec";

const mention = createInlineContentSpec(
  {
    type: "mention",
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
    type: "tag",
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
  mention,
  tag,
} satisfies InlineContentSpecs;

export const customInlineContentTestCases: EditorTestCases<
  DefaultBlockSchema,
  InlineContentSchemaFromSpecs<typeof customInlineContent>,
  DefaultStyleSchema
> = {
  name: "custom style schema",
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
            "I enjoy working with",
            {
              type: "mention",
              props: {
                user: "Matthew",
              },
              content: undefined,
            } as any,
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
            } as any,
          ],
        },
      ],
    },
  ],
};
