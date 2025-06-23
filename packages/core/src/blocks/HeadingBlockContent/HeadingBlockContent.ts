import { InputRule } from "@tiptap/core";
import { updateBlockCommand } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";
import { getBlockInfoFromSelection } from "../../api/getBlockInfoFromPos.js";
import {
  PropSchema,
  createBlockSpecFromStronglyTypedTiptapNode,
  createStronglyTypedTiptapNode,
  getBlockFromPos,
  propsToAttributes,
} from "../../schema/index.js";
import { createDefaultBlockDOMOutputSpec } from "../defaultBlockHelpers.js";
import { defaultProps } from "../defaultProps.js";
import { createToggleWrapper } from "../ToggleWrapper/createToggleWrapper.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

export const headingPropSchema = {
  ...defaultProps,
  level: { default: 1, values: HEADING_LEVELS },
  isToggleable: { default: false },
} satisfies PropSchema;

const HeadingBlockContent = createStronglyTypedTiptapNode({
  name: "heading",
  content: "inline*",
  group: "blockContent",

  addAttributes() {
    return propsToAttributes(headingPropSchema);
  },

  addInputRules() {
    const editor = this.options.editor as BlockNoteEditor<any, any, any>;
    return [
      ...editor.settings.heading.levels.map((level) => {
        // Creates a heading of appropriate level when starting with "#", "##", or "###".
        return new InputRule({
          find: new RegExp(`^(#{${level}})\\s$`),
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
                  type: "heading",
                  props: {
                    level: level as any,
                  },
                }),
              )
              // Removes the "#" character(s) used to set the heading.
              .deleteRange({ from: range.from, to: range.to })
              .run();
          },
        });
      }),
    ];
  },

  addKeyboardShortcuts() {
    const editor = this.options.editor as BlockNoteEditor<any, any, any>;

    return Object.fromEntries(
      editor.settings.heading.levels.map((level) => [
        `Mod-Alt-${level}`,
        () => {
          const blockInfo = getBlockInfoFromSelection(this.editor.state);
          if (
            !blockInfo.isBlockContainer ||
            blockInfo.blockContent.node.type.spec.content !== "inline*"
          ) {
            return true;
          }

          return this.editor.commands.command(
            updateBlockCommand(blockInfo.bnBlock.beforePos, {
              type: "heading",
              props: {
                level: level as any,
              },
            }),
          );
        },
      ]),
    );
  },
  parseHTML() {
    const editor = this.options.editor as BlockNoteEditor<any, any, any>;

    return [
      // Parse from internal HTML.
      {
        tag: "div[data-content-type=" + this.name + "]",
        contentElement: ".bn-inline-content",
      },
      ...editor.settings.heading.levels.map((level) => ({
        tag: `h${level}`,
        attrs: { level },
        node: "heading",
      })),
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return createDefaultBlockDOMOutputSpec(
      this.name,
      `h${node.attrs.level}`,
      {
        ...(this.options.domAttributes?.blockContent || {}),
        ...HTMLAttributes,
      },
      this.options.domAttributes?.inlineContent || {},
    );
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos }) => {
      const { dom, contentDOM } = createDefaultBlockDOMOutputSpec(
        this.name,
        `h${node.attrs.level}`,
        {
          ...(this.options.domAttributes?.blockContent || {}),
          ...HTMLAttributes,
        },
        this.options.domAttributes?.inlineContent || {},
      );
      dom.removeChild(contentDOM);

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

export const Heading = createBlockSpecFromStronglyTypedTiptapNode(
  HeadingBlockContent,
  headingPropSchema,
);
