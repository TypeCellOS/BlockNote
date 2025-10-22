import {
  BlockFromConfig,
  BlockNoteEditor,
  BlockNoteSchema,
  addNodeAndExtensionsToSpec,
  createBlockSpec,
  createImageBlockConfig,
  createImageBlockSpec,
  createInlineContentSpec,
  createPageBreakBlockSpec,
  createStyleSpec,
  defaultProps,
} from "@blocknote/core";

// BLOCKS ----------------------------------------------------------------------

// This is a modified version of the default image block that does not implement
// a `toExternalHTML` function. It's used to test if the custom serializer by
// default serializes custom blocks using their `render` function.
const SimpleImage = addNodeAndExtensionsToSpec(
  {
    type: "simpleImage",
    propSchema: createImageBlockConfig({}).propSchema,
    content: "none",
  },
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

const CustomParagraph = addNodeAndExtensionsToSpec(
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
  },
);

const SimpleCustomParagraph = addNodeAndExtensionsToSpec(
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
  },
);

// This block is used to test converting partial blocks into full blocks when
// exporting. If any of the fields are incorrectly defined, will throw an
// error.
const validateBlock = (
  block: BlockFromConfig<any, any, any>,
  editor: BlockNoteEditor<any, any, any>,
) => {
  if (typeof block.id !== "string") {
    throw new Error("ID of block is not a string.");
  }

  if (typeof block.type !== "string") {
    throw new Error("Type of block is not a string.");
  }

  if (block.type !== "exportTestBlock") {
    throw new Error(`Block has wrong type ("${block.type}").`);
  }

  if (block.props === undefined) {
    throw new Error("Block has no props.");
  }

  const propSchema = editor.schema.blockSchema.exportTestBlock.propSchema;
  const propSchemaSize = Object.keys(propSchema).length;
  const propsSize = Object.keys(block.props).length;

  if (propsSize !== propSchemaSize) {
    throw new Error(
      `Block has ${propsSize} props but its schema declares it should have ${propSchemaSize}.`,
    );
  }

  for (const [propName, propValue] of Object.entries(block.props)) {
    if (!(propName in propSchema)) {
      throw new Error(
        `Block has prop "${propName}" that is not declared in its schema.`,
      );
    }

    if (
      typeof propValue !==
      typeof propSchema[propName as keyof typeof propSchema].default
    ) {
      throw new Error(
        `Block has prop "${propName} that is of incorrect type (${typeof propValue}).`,
      );
    }
  }

  if (block.content !== undefined) {
    throw new Error(
      "Block has content but it's schema declares it should be undefined.",
    );
  }

  if (!Array.isArray(block.children)) {
    throw new Error("Block is missing children array.");
  }

  for (const child of block.children) {
    validateBlock(child, editor);
  }
};
const createExportTestBlock = createBlockSpec(
  {
    type: "exportTestBlock",
    propSchema: defaultProps,
    content: "none",
  },
  {
    render: (block, editor) => {
      validateBlock(block, editor);

      return {
        dom: document.createElement("div"),
      };
    },
    toExternalHTML: (block, editor) => {
      validateBlock(block, editor);

      return {
        dom: document.createElement("div"),
      };
    },
  },
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
      dom.className = "mention-internal";
      dom.setAttribute("data-user", ic.props.user);

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
    propSchema: {},
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
    customParagraph: CustomParagraph,
    simpleCustomParagraph: SimpleCustomParagraph,
    simpleImage: SimpleImage,
    exportTestBlock: createExportTestBlock(),
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
