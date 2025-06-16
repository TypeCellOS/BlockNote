import { updateBlockCommand } from "../../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { getBlockInfoFromSelection } from "../../../api/getBlockInfoFromPos.js";
import {
  PropSchema,
  createBlockSpecFromStronglyTypedTiptapNode,
  createStronglyTypedTiptapNode,
  getBlockFromPos,
} from "../../../schema/index.js";
import { createDefaultBlockDOMOutputSpec } from "../../defaultBlockHelpers.js";
import { defaultProps } from "../../defaultProps.js";
import { createToggleWrapper } from "../../ToggleWrapper/createToggleWrapper.js";
import { handleEnter } from "../ListItemKeyboardShortcuts.js";

export const toggleListItemPropSchema = {
  ...defaultProps,
} satisfies PropSchema;

const ToggleListItemBlockContent = createStronglyTypedTiptapNode({
  name: "toggleListItem",
  content: "inline*",
  group: "blockContent",
  // This is to make sure that the list item Enter keyboard handler takes
  // priority over the default one.
  priority: 90,
  addKeyboardShortcuts() {
    return {
      Enter: () => handleEnter(this.options.editor),
      "Mod-Shift-6": () => {
        const blockInfo = getBlockInfoFromSelection(this.editor.state);
        if (
          !blockInfo.isBlockContainer ||
          blockInfo.blockContent.node.type.spec.content !== "inline*"
        ) {
          return true;
        }

        return this.editor.commands.command(
          updateBlockCommand(blockInfo.bnBlock.beforePos, {
            type: "toggleListItem",
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

  addNodeView() {
    return ({ HTMLAttributes, getPos }) => {
      const { dom, contentDOM } = createDefaultBlockDOMOutputSpec(
        this.name,
        "p",
        {
          ...(this.options.domAttributes?.blockContent || {}),
          ...HTMLAttributes,
        },
        this.options.domAttributes?.inlineContent || {},
      );

      const editor = this.options.editor;
      const block = getBlockFromPos(getPos, editor, this.editor, this.name);

      const toggleWrapper = createToggleWrapper(
        block as any,
        editor,
        contentDOM,
      );
      dom.appendChild(toggleWrapper.dom);

      return {
        dom,
        contentDOM,
        ignoreMutation: toggleWrapper.ignoreMutation,
        destroy: toggleWrapper.destroy,
      };
    };
  },
});

export const ToggleListItem = createBlockSpecFromStronglyTypedTiptapNode(
  ToggleListItemBlockContent,
  toggleListItemPropSchema,
);
