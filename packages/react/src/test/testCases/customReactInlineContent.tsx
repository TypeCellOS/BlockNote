import {
  BlockNoteEditor,
  DefaultBlockSchema,
  DefaultStyleSchema,
  EditorTestCases,
  InlineContentSchemaFromSpecs,
  InlineContentSpecs,
  defaultInlineContentSpecs,
  uploadToTmpFilesDotOrg_DEV_ONLY,
} from "@blocknote/core";
import { createReactInlineContentSpec } from "../../schema/ReactInlineContentSpec";

const mention = createReactInlineContentSpec(
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
    render: (props) => {
      return <span>@{props.inlineContent.props.user}</span>;
    },
  }
);

const tag = createReactInlineContentSpec(
  {
    type: "tag",
    propSchema: {},
    content: "styled",
  },
  {
    render: (props) => {
      return (
        <span>
          #<span ref={props.contentRef}></span>
        </span>
      );
    },
  }
);

const customReactInlineContent = {
  ...defaultInlineContentSpecs,
  tag,
  mention,
} satisfies InlineContentSpecs;

export const customReactInlineContentTestCases: EditorTestCases<
  DefaultBlockSchema,
  InlineContentSchemaFromSpecs<typeof customReactInlineContent>,
  DefaultStyleSchema
> = {
  name: "custom react inline content schema",
  createEditor: () => {
    return BlockNoteEditor.create({
      uploadFile: uploadToTmpFilesDotOrg_DEV_ONLY,
      inlineContentSpecs: customReactInlineContent,
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
