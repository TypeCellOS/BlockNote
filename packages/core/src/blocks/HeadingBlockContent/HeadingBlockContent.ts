import { InputRule } from "@tiptap/core";
import {
  PropSchema,
  createBlockSpecFromStronglyTypedTiptapNode,
  createStronglyTypedTiptapNode,
} from "../../schema";
import { createDefaultBlockDOMOutputSpec } from "../defaultBlockHelpers";
import { defaultProps } from "../defaultProps";
import { getCurrentBlockContentType } from "../../api/getCurrentBlockContentType";

export const headingPropSchema = {
  ...defaultProps,
  level: { default: 1, values: [1, 2, 3] as const },
} satisfies PropSchema;

const HeadingBlockContent = createStronglyTypedTiptapNode({
  name: "heading",
  content: "inline*",
  group: "blockContent",
  addAttributes() {
    return {
      level: {
        default: 1,
        // instead of "level" attributes, use "data-level"
        parseHTML: (element) => {
          const attr = element.getAttribute("data-level")!;
          const parsed = parseInt(attr);
          if (isFinite(parsed)) {
            return parsed;
          }
          return undefined;
        },
        renderHTML: (attributes) => {
          return {
            "data-level": (attributes.level as number).toString(),
          };
        },
      },
    };
  },

  addInputRules() {
    return [
      ...[1, 2, 3].map((level) => {
        // Creates a heading of appropriate level when starting with "#", "##", or "###".
        return new InputRule({
          find: new RegExp(`^(#{${level}})\\s$`),
          handler: ({ state, chain, range }) => {
            if (getCurrentBlockContentType(this.editor) !== "inline*") {
              return;
            }

            chain()
              .BNUpdateBlock(state.selection.from, {
                type: "heading",
                props: {
                  level: level as any,
                },
              })
              // Removes the "#" character(s) used to set the heading.
              .deleteRange({ from: range.from, to: range.to });
          },
        });
      }),
    ];
  },

  parseHTML() {
    return [
      {
        tag: "div[data-content-type=" + this.name + "]",
        getAttrs: (element) => {
          if (typeof element === "string") {
            return false;
          }

          return {
            level: element.getAttribute("data-level"),
          };
        },
      },
      {
        tag: "h1",
        attrs: { level: 1 },
        node: "heading",
      },
      {
        tag: "h2",
        attrs: { level: 2 },
        node: "heading",
      },
      {
        tag: "h3",
        attrs: { level: 3 },
        node: "heading",
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return createDefaultBlockDOMOutputSpec(
      this.name,
      `h${node.attrs.level}`,
      {
        ...(this.options.domAttributes?.blockContent || {}),
        ...HTMLAttributes,
      },
      this.options.domAttributes?.inlineContent || {}
    );
  },
});

export const Heading = createBlockSpecFromStronglyTypedTiptapNode(
  HeadingBlockContent,
  headingPropSchema
);
