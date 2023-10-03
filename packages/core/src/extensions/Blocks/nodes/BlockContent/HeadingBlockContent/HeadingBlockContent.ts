import { InputRule, mergeAttributes } from "@tiptap/core";
import { defaultProps } from "../../../api/defaultProps";
import { createTipTapBlock } from "../../../api/block";
import { BlockSpec, PropSchema } from "../../../api/blockTypes";
import { mergeCSSClasses } from "../../../../../shared/utils";
import styles from "../../Block.module.css";

export const headingPropSchema = {
  ...defaultProps,
  level: { default: 1, values: [1, 2, 3] as const },
} satisfies PropSchema;

const HeadingBlockContent = createTipTapBlock<"heading", true>({
  name: "heading",
  content: "inline*",

  addAttributes() {
    return {
      level: {
        default: 1,
        // instead of "level" attributes, use "data-level"
        parseHTML: (element) => element.getAttribute("data-level")!,
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
            chain()
              .BNUpdateBlock<{
                heading: BlockSpec<"heading", typeof headingPropSchema, true>;
              }>(state.selection.from, {
                type: "heading",
                props: {
                  level: level as 1 | 2 | 3,
                },
              })
              // Removes the "#" character(s) used to set the heading.
              .deleteRange({ from: range.from, to: range.to });
          },
        });
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Alt-1": () =>
        this.editor.commands.BNUpdateBlock<{
          heading: BlockSpec<"heading", typeof headingPropSchema, true>;
        }>(this.editor.state.selection.anchor, {
          type: "heading",
          props: {
            level: 1,
          },
        }),
      "Mod-Alt-2": () =>
        this.editor.commands.BNUpdateBlock<{
          heading: BlockSpec<"heading", typeof headingPropSchema, true>;
        }>(this.editor.state.selection.anchor, {
          type: "heading",
          props: {
            level: 2,
          },
        }),
      "Mod-Alt-3": () =>
        this.editor.commands.BNUpdateBlock<{
          heading: BlockSpec<"heading", typeof headingPropSchema, true>;
        }>(this.editor.state.selection.anchor, {
          type: "heading",
          props: {
            level: 3,
          },
        }),
    };
  },

  parseHTML() {
    return [
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
    const blockContentDOMAttributes =
      this.options.domAttributes?.blockContent || {};
    const inlineContentDOMAttributes =
      this.options.domAttributes?.inlineContent || {};

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        ...blockContentDOMAttributes,
        class: mergeCSSClasses(
          styles.blockContent,
          blockContentDOMAttributes.class
        ),
        "data-content-type": this.name,
      }),
      [
        `h${node.attrs.level}`,
        {
          ...inlineContentDOMAttributes,
          class: mergeCSSClasses(
            styles.inlineContent,
            inlineContentDOMAttributes.class
          ),
        },
        0,
      ],
    ];
  },
});

export const Heading = {
  node: HeadingBlockContent,
  propSchema: headingPropSchema,
} satisfies BlockSpec<"heading", typeof headingPropSchema, true>;
