import { EditorTestCases } from "..";
import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  defaultStyleSpecs,
  uploadToTmpFilesDotOrg_DEV_ONLY,
} from "../../..";
import { BlockNoteEditor } from "../../../BlockNoteEditor";
import { createStyleSpec } from "../../../extensions/Blocks/api/styles/createSpec";
import {
  StyleSchemaFromSpecs,
  StyleSpecs,
} from "../../../extensions/Blocks/api/styles/types";

const small = createStyleSpec(
  {
    type: "small",
    propSchema: "boolean",
  },
  {
    render: () => {
      const dom = document.createElement("small");
      return {
        dom,
        contentDOM: dom,
      };
    },
  }
);

const fontSize = createStyleSpec(
  {
    type: "fontSize",
    propSchema: "string",
  },
  {
    render: (value) => {
      const dom = document.createElement("span");
      dom.setAttribute("style", "font-size: " + value);
      return {
        dom,
        contentDOM: dom,
      };
    },
  }
);

const customStyles = {
  ...defaultStyleSpecs,
  small,
  fontSize,
} satisfies StyleSpecs;

export const customStylesTestCases: EditorTestCases<
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  StyleSchemaFromSpecs<typeof customStyles>
> = {
  name: "custom style schema",
  createEditor: () => {
    return BlockNoteEditor.create({
      uploadFile: uploadToTmpFilesDotOrg_DEV_ONLY,
      styleSpecs: customStyles,
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
