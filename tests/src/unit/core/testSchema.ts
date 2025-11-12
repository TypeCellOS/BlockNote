import {
  BlockNoteSchema,
  createBlockConfig,
  createBlockSpec,
  createImageBlockConfig,
  createImageBlockSpec,
  createInlineContentSpec,
  createPageBreakBlockSpec,
  createPropSchemaFromZod,
  createStyleSpec,
  defaultPropSchema,
  parseDefaultProps,
} from "@blocknote/core";
import { z } from "zod/v4";

// BLOCKS ----------------------------------------------------------------------

// This is a modified version of the default image block that does not implement
// a `toExternalHTML` function. It's used to test if the custom serializer by
// default serializes custom blocks using their `render` function.
const SimpleImage = createBlockSpec(
  createBlockConfig(
    () =>
      ({
        type: "simpleImage",
        propSchema: createImageBlockConfig({}).propSchema,
        content: "none",
      }) as const,
  ),
  {
    render(block, editor) {
      return createImageBlockSpec().implementation.render.call(
        this,
        block as any,
        editor as any,
      );
    },
  },
);

const CustomParagraph = createBlockSpec(
  createBlockConfig(
    () =>
      ({
        type: "customParagraph",
        propSchema: defaultPropSchema,
        content: "inline",
      }) as const,
  ),
  {
    parse: (e) => {
      if (e.tagName !== "P") {
        return undefined;
      }

      if (e.classList.contains("custom-paragraph")) {
        return parseDefaultProps(e);
      }

      return undefined;
    },
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

      return {
        dom: paragraph,
      };
    },
  },
);

const SimpleCustomParagraph = createBlockSpec(
  createBlockConfig(
    () =>
      ({
        type: "simpleCustomParagraph",
        propSchema: defaultPropSchema,
        content: "inline",
      }) as const,
  ),
  {
    render: () => {
      const paragraph = document.createElement("p");
      paragraph.className = "simple-custom-paragraph";

      return {
        dom: paragraph,
        contentDOM: paragraph,
      };
    },
  },
);

// INLINE CONTENT --------------------------------------------------------------

const Mention = createInlineContentSpec(
  {
    type: "mention",
    propSchema: createPropSchemaFromZod(
      z.object({
        user: z.string().default(""),
      }),
    ),
    content: "none",
  },
  {
    render: (ic) => {
      const dom = document.createElement("span");
      dom.appendChild(document.createTextNode("@" + ic.props.user));
      dom.className = "mention-internal";
      dom.setAttribute("data-user", ic.props.user);
      dom.style.backgroundColor = "red";

      return {
        dom,
      };
    },

    toExternalHTML: (ic) => {
      const dom = document.createElement("span");
      dom.appendChild(document.createTextNode("@" + ic.props.user));
      dom.className = "mention-external";
      dom.setAttribute("data-external", "true");
      // Add attributes needed for round-trip compatibility
      dom.setAttribute("data-inline-content-type", "mention");
      dom.setAttribute("data-user", ic.props.user);
      dom.style.backgroundColor = "red";

      return {
        dom,
      };
    },

    parse: (el) => {
      const user = el.getAttribute("data-user");
      if (user !== null) {
        return { user };
      }
      return undefined;
    },
  },
);

const Tag = createInlineContentSpec(
  {
    type: "tag" as const,
    propSchema: createPropSchemaFromZod(z.object({})),
    content: "styled",
  },
  {
    parse: (el) => {
      const isTag = el.getAttribute("data-tag");
      if (isTag) {
        return {};
      }
      return undefined;
    },
    render: () => {
      const dom = document.createElement("span");
      dom.textContent = "#";

      const contentDOM = document.createElement("span");
      dom.appendChild(contentDOM);
      contentDOM.setAttribute("data-tag", "true");

      return {
        dom,
        contentDOM,
      };
    },
  },
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
  },
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
  },
);

// SCHEMA ----------------------------------------------------------------------

export const testSchema = BlockNoteSchema.create().extend({
  blockSpecs: {
    pageBreak: createPageBreakBlockSpec(),
    customParagraph: CustomParagraph(),
    simpleCustomParagraph: SimpleCustomParagraph(),
    simpleImage: SimpleImage(),
  },
  inlineContentSpecs: {
    mention: Mention,
    tag: Tag,
  },
  styleSpecs: {
    small: Small,
    fontSize: FontSize,
  },
});

export type TestBlockSchema = typeof testSchema.blockSchema;
export type TestInlineContentSchema = typeof testSchema.inlineContentSchema;
export type TestStyleSchema = typeof testSchema.styleSchema;
