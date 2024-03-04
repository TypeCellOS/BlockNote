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

const small = createReactStyleSpec(
  {
    type: "small",
    propSchema: "boolean",
  },
  {
    render: (props) => {
      return <small ref={props.contentRef}></small>;
    },
  }
);

const fontSize = createReactStyleSpec(
  {
    type: "fontSize",
    propSchema: "string",
  },
  {
    render: (props) => {
      return (
        <span ref={props.contentRef} style={{ fontSize: props.value }}></span>
      );
    },
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
