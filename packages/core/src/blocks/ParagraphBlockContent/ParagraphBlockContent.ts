import {
  createBlockSpecFromStronglyTypedTiptapNode,
  createStronglyTypedTiptapNode,
} from "../../schema";
import { createDefaultBlockDOMOutputSpec } from "../defaultBlockHelpers";
import { defaultProps } from "../defaultProps";
import { getCurrentBlockContentType } from "../../api/getCurrentBlockContentType";

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
        if (getCurrentBlockContentType(this.editor) !== "inline*") {
          return true;
        }

        return this.editor.commands.BNUpdateBlock(
          this.editor.state.selection.anchor,
          {
            type: "paragraph",
            props: {},
          }
        );
      },
    };
  },

  parseHTML() {
    return [
      { tag: "div[data-content-type=" + this.name + "]" },
      {
        tag: "p",
        priority: 200,
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
      this.options.domAttributes?.inlineContent || {}
    );
  },
});

export const Paragraph = createBlockSpecFromStronglyTypedTiptapNode(
  ParagraphBlockContent,
  paragraphPropSchema
);
