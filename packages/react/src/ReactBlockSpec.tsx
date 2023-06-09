import {
  BlockConfig,
  BlockSchema,
  BlockSpec,
  blockStyles,
  camelToDataKebab,
  createTipTapBlock,
  parse,
  PropSchema,
  propsToAttributes,
  render,
} from "@blocknote/core";
import {
  NodeViewContent,
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import { FC, HTMLAttributes } from "react";

// extend BlockConfig but use a react render function
export type ReactBlockConfig<
  Type extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean,
  BSchema extends BlockSchema
> = Omit<
  BlockConfig<Type, PSchema, ContainsInlineContent, BSchema>,
  "render"
> & {
  render: FC<{
    block: Parameters<
      BlockConfig<Type, PSchema, ContainsInlineContent, BSchema>["render"]
    >[0];
    editor: Parameters<
      BlockConfig<Type, PSchema, ContainsInlineContent, BSchema>["render"]
    >[1];
  }>;
};

export const InlineContent = (props: HTMLAttributes<HTMLDivElement>) => (
  <NodeViewContent
    {...props}
    className={`${props.className ? props.className + " " : ""}${
      blockStyles.inlineContent
    }`}
  />
);

// A function to create custom block for API consumers
// we want to hide the tiptap node from API consumers and provide a simpler API surface instead
export function createReactBlockSpec<
  BType extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean,
  BSchema extends BlockSchema
>(
  blockConfig: ReactBlockConfig<BType, PSchema, ContainsInlineContent, BSchema>
): BlockSpec<BType, PSchema> {
  const node = createTipTapBlock<BType>({
    name: blockConfig.type,
    content: blockConfig.containsInlineContent ? "inline*" : "",
    selectable: blockConfig.containsInlineContent,

    addOptions() {
      return {
        editor: undefined,
      };
    },

    addAttributes() {
      return propsToAttributes(blockConfig);
    },

    parseHTML() {
      return parse(blockConfig);
    },

    renderHTML({ HTMLAttributes }) {
      return render(blockConfig, HTMLAttributes);
    },

    addNodeView() {
      const BlockContent: FC<NodeViewProps> = (props: NodeViewProps) => {
        const Content = blockConfig.render;

        // Add props as HTML attributes in kebab-case with "data-" prefix
        const htmlAttributes: Record<string, string> = {};
        for (const [attribute, value] of Object.entries(props.node.attrs)) {
          if (attribute in blockConfig.propSchema) {
            htmlAttributes[camelToDataKebab(attribute)] = value;
          }
        }

        // Gets BlockNote editor instance
        const editor = this.options.editor!;
        // Gets position of the node
        const pos =
          typeof props.getPos === "function" ? props.getPos() : undefined;
        // Gets TipTap editor instance
        const tipTapEditor = editor._tiptapEditor;
        // Gets parent blockContainer node
        const blockContainer = tipTapEditor.state.doc.resolve(pos!).node();
        // Gets block identifier
        const blockIdentifier = blockContainer.attrs.id;
        // Get the block
        const block = editor.getBlock(blockIdentifier)!;
        if (block.type !== blockConfig.type) {
          throw new Error("Block type does not match");
        }

        return (
          <NodeViewWrapper
            className={blockStyles.blockContent}
            data-content-type={blockConfig.type}
            {...htmlAttributes}>
            <Content block={block} editor={editor} />
          </NodeViewWrapper>
        );
      };

      return ReactNodeViewRenderer(BlockContent, {
        className: blockStyles.reactNodeViewRenderer,
      });
    },
  });

  return {
    node: node,
    propSchema: blockConfig.propSchema,
  };
}
