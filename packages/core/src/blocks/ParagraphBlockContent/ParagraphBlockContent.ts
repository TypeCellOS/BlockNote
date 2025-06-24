import { updateBlockCommand } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { getBlockInfoFromSelection } from "../../api/getBlockInfoFromPos.js";
import {
  createBlockSpecFromStronglyTypedTiptapNode,
  createStronglyTypedTiptapNode,
} from "../../schema/index.js";
import { createDefaultBlockDOMOutputSpec } from "../defaultBlockHelpers.js";
import { defaultProps } from "../defaultProps.js";

export const paragraphPropSchema = {
  ...defaultProps,
};

export const ParagraphBlockContent = createStronglyTypedTiptapNode({
  name: "paragraph",
  content: "inline*",
  group: "blockContent",

  addKeyboardShortcuts() {
    return {
      "Mod-Alt-0": () => {
        const blockInfo = getBlockInfoFromSelection(this.editor.state);
        if (
          !blockInfo.isBlockContainer ||
          blockInfo.blockContent.node.type.spec.content !== "inline*"
        ) {
          return true;
        }

        return this.editor.commands.command(
          updateBlockCommand(blockInfo.bnBlock.beforePos, {
            type: "paragraph",
            props: {},
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
        tag: "p",
        getAttrs: (element) => {
          if (typeof element === "string" || !element.textContent?.trim()) {
            return false;
          }

          return {};
        },
        node: "paragraph",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return createDefaultBlockDOMOutputSpec(
      this.name,
      "p",
      {
        ...(this.options.domAttributes?.blockContent || {}),
        ...HTMLAttributes,
      },
      this.options.domAttributes?.inlineContent || {},
    );
  },
});

export const Paragraph = createBlockSpecFromStronglyTypedTiptapNode(
  ParagraphBlockContent,
  paragraphPropSchema,
);
