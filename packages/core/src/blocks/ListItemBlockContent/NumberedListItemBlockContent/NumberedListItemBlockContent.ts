import { InputRule } from "@tiptap/core";
import { updateBlockCommand } from "../../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { getBlockInfoFromSelection } from "../../../api/getBlockInfoFromPos.js";
import {
  PropSchema,
  createBlockSpecFromStronglyTypedTiptapNode,
  createStronglyTypedTiptapNode,
  propsToAttributes,
} from "../../../schema/index.js";
import { createDefaultBlockDOMOutputSpec } from "../../defaultBlockHelpers.js";
import { defaultProps } from "../../defaultProps.js";
import { handleEnter } from "../ListItemKeyboardShortcuts.js";
import { NumberedListIndexingPlugin } from "./NumberedListIndexingPlugin.js";

export const numberedListItemPropSchema = {
  ...defaultProps,
  start: { default: undefined, type: "number" },
} satisfies PropSchema;

const NumberedListItemBlockContent = createStronglyTypedTiptapNode({
  name: "numberedListItem",
  content: "inline*",
  group: "blockContent",
  priority: 90,
  addAttributes() {
    return {
      ...propsToAttributes(numberedListItemPropSchema),
      // the index attribute is only used internally (it's not part of the blocknote schema)
      // that's why it's defined explicitly here, and not part of the prop schema
      index: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-index"),
        renderHTML: (attributes) => {
          return {
            "data-index": attributes.index,
          };
        },
      },
    };
  },

  addInputRules() {
    return [
      // Creates an ordered list when starting with "1.".
      new InputRule({
        find: new RegExp(`^(\\d+)\\.\\s$`),
        handler: ({ state, chain, range, match }) => {
          const blockInfo = getBlockInfoFromSelection(state);
          if (
            !blockInfo.isBlockContainer ||
            blockInfo.blockContent.node.type.spec.content !== "inline*" ||
            blockInfo.blockNoteType === "numberedListItem"
          ) {
            return;
          }
          const startIndex = parseInt(match[1]);

          chain()
            .command(
              updateBlockCommand(
                this.options.editor,
                blockInfo.bnBlock.beforePos,
                {
                  type: "numberedListItem",
                  props:
                    (startIndex === 1 && {}) ||
                    ({
                      start: startIndex,
                    } as any),
                }
              )
            )
            // Removes the "1." characters used to set the list.
            .deleteRange({ from: range.from, to: range.to });
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => handleEnter(this.options.editor),
      "Mod-Shift-7": () => {
        const blockInfo = getBlockInfoFromSelection(this.editor.state);
        if (
          !blockInfo.isBlockContainer ||
          blockInfo.blockContent.node.type.spec.content !== "inline*"
        ) {
          return true;
        }

        return this.editor.commands.command(
          updateBlockCommand(this.options.editor, blockInfo.bnBlock.beforePos, {
            type: "numberedListItem",
            props: {},
          })
        );
      },
    };
  },

  addProseMirrorPlugins() {
    return [NumberedListIndexingPlugin()];
  },

  parseHTML() {
    return [
      {
        tag: "div[data-content-type=" + this.name + "]",
      },
      // Case for regular HTML list structure.
      // (e.g.: when pasting from other apps)
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

          if (
            parent.tagName === "OL" ||
            (parent.tagName === "DIV" && parent.parentElement!.tagName === "OL")
          ) {
            const startIndex =
              parseInt(parent.getAttribute("start") || "1") || 1;

            if (element.previousSibling || startIndex === 1) {
              return {};
            }

            return {
              start: startIndex,
            };
          }

          return false;
        },
        node: "numberedListItem",
      },
      // Case for BlockNote list structure.
      // (e.g.: when pasting from blocknote)
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

          if (parent.getAttribute("data-content-type") === "numberedListItem") {
            return {};
          }

          return false;
        },
        priority: 300,
        node: "numberedListItem",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return createDefaultBlockDOMOutputSpec(
      this.name,
      // We use a <p> tag, because for <li> tags we'd need an <ol> element to
      // put them in to be semantically correct, which we can't have due to the
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

export const NumberedListItem = createBlockSpecFromStronglyTypedTiptapNode(
  NumberedListItemBlockContent,
  numberedListItemPropSchema
);
