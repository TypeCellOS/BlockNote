import {
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from "../../blocks/defaultBlocks.js";
import { defaultProps } from "../../blocks/defaultProps.js";
import {
  imagePropSchema,
  imageRender,
} from "../../blocks/ImageBlockContent/ImageBlockContent.js";
import { PageBreak } from "../../blocks/PageBreakBlockContent/PageBreakBlockContent.js";
import { BlockNoteSchema } from "../../editor/BlockNoteSchema.js";
import {
  createBlockSpec,
  createInlineContentSpec,
  createStyleSpec,
} from "../../schema/index.js";

// BLOCKS ----------------------------------------------------------------------

// This is a modified version of the default image block that does not implement
// a `toExternalHTML` function. It's used to test if the custom serializer by
// default serializes custom blocks using their `render` function.
const SimpleImage = createBlockSpec(
  {
    type: "simpleImage",
    propSchema: imagePropSchema,
    content: "none",
  },
  {
    render: (block, editor) => imageRender(block as any, editor as any),
  }
);

const CustomParagraph = createBlockSpec(
  {
    type: "customParagraph",
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
    type: "simpleCustomParagraph",
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

// INLINE CONTENT --------------------------------------------------------------

const Mention = createInlineContentSpec(
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

const Tag = createInlineContentSpec(
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

// STYLES ----------------------------------------------------------------------

const Small = createStyleSpec(
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

const FontSize = createStyleSpec(
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

// SCHEMA ----------------------------------------------------------------------

export const testSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    pageBreak: PageBreak,
    customParagraph: CustomParagraph,
    simpleCustomParagraph: SimpleCustomParagraph,
    simpleImage: SimpleImage,
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    mention: Mention,
    tag: Tag,
  },
  styleSpecs: {
    ...defaultStyleSpecs,
    small: Small,
    fontSize: FontSize,
  },
});

export type TestBlockSchema = typeof testSchema.blockSchema;
export type TestInlineContentSchema = typeof testSchema.inlineContentSchema;
export type TestStyleSchema = typeof testSchema.styleSchema;
