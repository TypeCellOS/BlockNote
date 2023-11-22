import { InputRule } from "@tiptap/core";
import {
  createBlockSpecFromStronglyTypedTiptapNode,
  createStronglyTypedTiptapNode,
} from "../../../../api/blocks/internal";
import { PropSchema } from "../../../../api/blocks/types";
import { defaultProps } from "../../../../api/defaultProps";
import { createDefaultBlockDOMOutputSpec } from "../../defaultBlockHelpers";
import { handleEnter } from "../ListItemKeyboardShortcuts";

export const bulletListItemPropSchema = {
  ...defaultProps,
} satisfies PropSchema;

const BulletListItemBlockContent = createStronglyTypedTiptapNode({
  name: "bulletListItem",
  content: "inline*",
  group: "blockContent",
  defining: true,
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
        this.editor.commands.BNUpdateBlock(this.editor.state.selection.anchor, {
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
            debugger;
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
    return createDefaultBlockDOMOutputSpec(
      this.name,
      // We use a <p> tag, because for <li> tags we'd need a <ul> element to put
      // them in to be semantically correct, which we can't have due to the
      // schema.
      "p",
      {
        ...(this.options.domAttributes?.blockContent || {}),
        ...HTMLAttributes,
      },
      this.options.domAttributes?.inlineContent || {}
    );
  },
});

export const BulletListItem = createBlockSpecFromStronglyTypedTiptapNode(
  BulletListItemBlockContent,
  bulletListItemPropSchema
);
