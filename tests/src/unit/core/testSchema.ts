import {
  BlockNoteSchema,
  createBlockConfig,
  createBlockSpec,
  createImageBlockConfig,
  createImageBlockSpec,
  createInlineContentSpec,
  createPageBreakBlockSpec,
  createStyleSpec,
  defaultProps,
  parseDefaultProps,
} from "@blocknote/core";

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
      return createImageBlockSpec().implementation.render!.call(
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
        propSchema: defaultProps,
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
        propSchema: defaultProps,
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

// A container block: it holds no inline content of its own, and its `contentDOM`
// is where its child blocks go. Covers containers in the format-conversion,
// clipboard and selection matrices, which otherwise never see one.
const Callout = createBlockSpec(
  {
    type: "callout" as const,
    propSchema: {
      flavor: {
        default: "tip" as const,
        values: ["tip", "info", "warning"] as const,
      },
    },
    content: "none",
    children: {
      allow: "blocks",
    },
  },
  {
    render: () => {
      const callout = document.createElement("div");
      callout.className = "callout";

      const body = document.createElement("div");
      body.className = "callout-body";
      callout.appendChild(body);

      return {
        dom: callout,
        contentDOM: body,
      };
    },
  },
);

// A titled block: an ordinary block with inline content (the title) whose
// `children` are a body that belongs to it. Covers titled blocks in the
// format-conversion, clipboard and selection matrices, which otherwise never
// see one (the `callout` above only covers pure containers).
const Alert = createBlockSpec(
  {
    type: "alert" as const,
    propSchema: {},
    content: "inline",
    children: {
      allow: "blocks",
    },
  },
  {
    render: () => {
      const alert = document.createElement("div");
      alert.className = "alert";

      return {
        dom: alert,
        contentDOM: alert,
      };
    },
    renderFrame: () => {
      const frame = document.createElement("div");
      frame.className = "alert-frame";

      const slot = document.createElement("div");
      slot.className = "alert-slot";
      frame.appendChild(slot);

      return {
        dom: frame,
        slot,
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
    customParagraph: CustomParagraph(),
    simpleCustomParagraph: SimpleCustomParagraph(),
    simpleImage: SimpleImage(),
    callout: Callout(),
    alert: Alert(),
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
