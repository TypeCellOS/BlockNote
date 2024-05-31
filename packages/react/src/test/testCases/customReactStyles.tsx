import {
  BlockNoteEditor,
  BlockNoteSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  EditorTestCases,
  defaultStyleSpecs,
  uploadToTmpFilesDotOrg_DEV_ONLY,
} from "@blocknote/core";
import { createReactStyleSpec } from "../../schema/ReactStyleSpec";
import { useContent } from "../../hooks/useContent";

const Small = () => {
  const contentProps = useContent();

  return <small {...contentProps} />;
};

const small = createReactStyleSpec(
  {
    type: "small",
    propSchema: "boolean",
  },
  {
    render: Small,
  }
);

const FontSize = (props: { value: string }) => {
  const { style, ...rest } = useContent();

  return <span style={{ fontSize: props.value, ...style }} {...rest} />;
};

const fontSize = createReactStyleSpec(
  {
    type: "fontSize",
    propSchema: "string",
  },
  {
    render: FontSize,
  }
);

const schema = BlockNoteSchema.create({
  styleSpecs: {
    ...defaultStyleSpecs,
    small,
    fontSize,
  },
});

export const customReactStylesTestCases: EditorTestCases<
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  typeof schema.styleSchema
> = {
  name: "custom react style schema",
  createEditor: () => {
    return BlockNoteEditor.create({
      uploadFile: uploadToTmpFilesDotOrg_DEV_ONLY,
      schema,
    });
  },
  documents: [
    {
      name: "small/basic",
      blocks: [
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
      blocks: [
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
  ],
};
