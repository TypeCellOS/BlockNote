import {
  createBlockSpecFromStronglyTypedTiptapNode,
  createStronglyTypedTiptapNode,
} from "../../schema/index.js";
import {
  createDefaultBlockDOMOutputSpec,
  mergeParagraphs,
} from "../defaultBlockHelpers.js";
import { defaultProps } from "../defaultProps.js";
import { getBlockInfoFromSelection } from "../../api/getBlockInfoFromPos.js";
import { updateBlockCommand } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { InputRule } from "@tiptap/core";
import { DOMParser } from "prosemirror-model";

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
        getContent: (node, schema) => {
          // Parse the blockquote content as inline content
          const element = node as HTMLElement;

          // Clone to avoid modifying the original
          const clone = element.cloneNode(true) as HTMLElement;

          // Merge multiple paragraphs into one with line breaks
          mergeParagraphs(clone);

          // Parse the content directly as a paragraph to extract inline content
          const parser = DOMParser.fromSchema(schema);
          const parsed = parser.parse(clone, {
            topNode: schema.nodes.paragraph.create(),
          });

          return parsed.content;
        },
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
