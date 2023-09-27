import { InputRule, mergeAttributes } from "@tiptap/core";
import { defaultProps } from "../../../../api/defaultProps";
import { createTipTapBlock } from "../../../../api/block";
import { BlockSpec, PropSchema } from "../../../../api/blockTypes";
import { mergeCSSClasses } from "../../../../../../shared/utils";
import { handleEnter } from "../ListItemKeyboardShortcuts";
import styles from "../../../Block.module.css";

export const bulletListItemPropSchema = {
  ...defaultProps,
} satisfies PropSchema;

const BulletListItemBlockContent = createTipTapBlock<"bulletListItem", true>({
  name: "bulletListItem",
  content: "inline*",

  addInputRules() {
    return [
      // Creates an unordered list when starting with "-", "+", or "*".
      new InputRule({
        find: new RegExp(`^[-+*]\\s$`),
        handler: ({ state, chain, range }) => {
          chain()
            .BNUpdateBlock(state.selection.from, {
              type: "bulletListItem",
              props: {},
            })
            // Removes the "-", "+", or "*" character used to set the list.
            .deleteRange({ from: range.from, to: range.to });
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => handleEnter(this.editor),
      "Mod-Shift-7": () =>
        this.editor.commands.BNUpdateBlock<{
          bulletListItem: BlockSpec<
            "bulletListItem",
            typeof bulletListItemPropSchema,
            true
          >;
        }>(this.editor.state.selection.anchor, {
          type: "bulletListItem",
          props: {},
        }),
    };
  },

  parseHTML() {
    return [
      // Case for regular HTML list structure.
      {
        tag: "li",
        getAttrs: (element) => {
          if (typeof element === "string") {
            return false;
          }

          const parent = element.parentElement;

          if (parent === null) {
            return false;
          }

          if (parent.tagName === "UL") {
            return {};
          }

          return false;
        },
        node: "bulletListItem",
      },
      // Case for BlockNote list structure.
      {
        tag: "p",
        getAttrs: (element) => {
          if (typeof element === "string") {
            return false;
          }

          const parent = element.parentElement;

          if (parent === null) {
            return false;
          }

          if (parent.getAttribute("data-content-type") === "bulletListItem") {
            return {};
          }

          return false;
        },
        priority: 300,
        node: "bulletListItem",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
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
        "p",
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

export const BulletListItem = {
  node: BulletListItemBlockContent,
  propSchema: bulletListItemPropSchema,
} satisfies BlockSpec<"bulletListItem", typeof bulletListItemPropSchema, true>;
