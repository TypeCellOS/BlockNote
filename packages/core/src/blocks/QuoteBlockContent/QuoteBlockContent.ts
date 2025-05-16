import {
  createBlockSpecFromStronglyTypedTiptapNode,
  createStronglyTypedTiptapNode,
} from "../../schema/index.js";
import { createDefaultBlockDOMOutputSpec } from "../defaultBlockHelpers.js";
import { defaultProps } from "../defaultProps.js";
import { getBlockInfoFromSelection } from "../../api/getBlockInfoFromPos.js";
import { updateBlockCommand } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { InputRule } from "@tiptap/core";

export const quotePropSchema = {
  ...defaultProps,
};

export const QuoteBlockContent = createStronglyTypedTiptapNode({
  name: "quote",
  content: "inline*",
  group: "blockContent",

  addInputRules() {
    return [
      // Creates a block quote when starting with ">".
      new InputRule({
        find: new RegExp(`^>\\s$`),
        handler: ({ state, chain, range }) => {
          const blockInfo = getBlockInfoFromSelection(state);
          if (
            !blockInfo.isBlockContainer ||
            blockInfo.blockContent.node.type.spec.content !== "inline*"
          ) {
            return;
          }

          chain()
            .command(
              updateBlockCommand(blockInfo.bnBlock.beforePos, {
                type: "quote",
                props: {},
              }),
            )
            // Removes the ">" character used to set the list.
            .deleteRange({ from: range.from, to: range.to });
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Alt-q": () => {
        const blockInfo = getBlockInfoFromSelection(this.editor.state);
        if (
          !blockInfo.isBlockContainer ||
          blockInfo.blockContent.node.type.spec.content !== "inline*"
        ) {
          return true;
        }

        return this.editor.commands.command(
          updateBlockCommand(blockInfo.bnBlock.beforePos, {
            type: "quote",
          }),
        );
      },
    };
  },

  parseHTML() {
    return [
      // Parse from internal HTML.
      {
        tag: "div[data-content-type=" + this.name + "]",
        contentElement: ".bn-inline-content",
      },
      // Parse from external HTML.
      {
        tag: "blockquote",
        node: "quote",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return createDefaultBlockDOMOutputSpec(
      this.name,
      "blockquote",
      {
        ...(this.options.domAttributes?.blockContent || {}),
        ...HTMLAttributes,
      },
      this.options.domAttributes?.inlineContent || {},
    );
  },
});

export const Quote = createBlockSpecFromStronglyTypedTiptapNode(
  QuoteBlockContent,
  quotePropSchema,
);
