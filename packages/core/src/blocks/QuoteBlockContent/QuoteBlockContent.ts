import {
  createBlockSpecFromStronglyTypedTiptapNode,
  createStronglyTypedTiptapNode,
} from "../../schema/index.js";
import { createDefaultBlockDOMOutputSpec } from "../defaultBlockHelpers.js";
import { defaultProps } from "../defaultProps.js";
import { getBlockInfoFromSelection } from "../../api/getBlockInfoFromPos.js";
import { updateBlockCommand } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";

export const quotePropSchema = {
  ...defaultProps,
};

export const QuoteBlockContent = createStronglyTypedTiptapNode({
  name: "quote",
  content: "inline*",
  group: "blockContent",

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
          updateBlockCommand(this.options.editor, blockInfo.bnBlock.beforePos, {
            type: "quote",
          })
        );
      },
    };
  },

  parseHTML() {
    return [
      { tag: "div[data-content-type=" + this.name + "]" },
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
      this.options.domAttributes?.inlineContent || {}
    );
  },
});

export const Quote = createBlockSpecFromStronglyTypedTiptapNode(
  QuoteBlockContent,
  quotePropSchema
);
