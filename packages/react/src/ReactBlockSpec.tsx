import {
  BlockConfig,
  BlockNoteEditor,
  BlockSchema,
  BlockSpec,
  blockStyles,
  camelToDataKebab,
  createTipTapBlock,
  getBlockFromPos,
  parse,
  PropSchema,
  propsToAttributes,
  SpecificBlock,
} from "@blocknote/core";
import {
  NodeViewContent,
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import { FC, HTMLAttributes } from "react";
import { renderToString } from "react-dom/server";

// `BlockConfig` which returns a React component from its `render` function
// instead of a `dom` and optional `contentDOM` element.
export type ReactBlockConfig<
  BType extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean,
  BSchema extends BlockSchema & { [k in BType]: BlockSpec<BType, PSchema> }
> = Omit<
  BlockConfig<BType, PSchema, ContainsInlineContent, BSchema>,
  "render" | "serialize"
> & {
  render: FC<{
    block: Parameters<
      BlockConfig<BType, PSchema, ContainsInlineContent, BSchema>["render"]
    >[0];
    editor: Parameters<
      BlockConfig<BType, PSchema, ContainsInlineContent, BSchema>["render"]
    >[1];
  }>;
  serialize: ReactBlockConfig<
    BType,
    PSchema,
    ContainsInlineContent,
    BSchema
  >["render"];
};

// React component that's used instead of declaring a `contentDOM` for React
// custom blocks.
export const InlineContent = (props: HTMLAttributes<HTMLDivElement>) => {
  return (
    <NodeViewContent
      {...props}
      className={`${props.className ? props.className + " " : ""}${
        blockStyles.inlineContent
      }`}
    />
  );
};

// Function that wraps the React component returned from 'blockConfig.render' in
// a `NodeViewWrapper` which also acts as a `blockContent` div. It contains the
// block type and props as HTML attributes.
export function reactRenderWithBlockStructure<
  BType extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean,
  BSchema extends BlockSchema & { [k in BType]: BlockSpec<BType, PSchema> }
>(
  render: ReactBlockConfig<
    BType,
    PSchema,
    ContainsInlineContent,
    BSchema
  >["render"],
  block: SpecificBlock<BSchema, BType>,
  editor: BlockNoteEditor<BSchema>
) {
  const Content = render;
  // Add props as HTML attributes in kebab-case with "data-" prefix
  const htmlAttributes: Record<string, string> = {};
  // Add props as HTML attributes in kebab-case with "data-" prefix
  for (const [prop, value] of Object.entries(block.props)) {
    htmlAttributes[camelToDataKebab(prop)] = value;
  }

  return () => (
    <NodeViewWrapper
      className={blockStyles.blockContent}
      data-content-type={block.type}
      {...htmlAttributes}>
      <Content block={block} editor={editor} />
    </NodeViewWrapper>
  );
}

// A function to create custom block for API consumers
// we want to hide the tiptap node from API consumers and provide a simpler API surface instead
export function createReactBlockSpec<
  BType extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean,
  BSchema extends BlockSchema & { [k in BType]: BlockSpec<BType, PSchema> }
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

    addNodeView() {
      return (props) =>
        ReactNodeViewRenderer(
          (props: NodeViewProps) => {
            // Gets the BlockNote editor instance
            const editor = this.options.editor as BlockNoteEditor<BSchema>;
            // Gets the block
            const block = getBlockFromPos<BType, PSchema, BSchema>(
              props.getPos,
              editor,
              this.editor,
              blockConfig.type
            );

            const BlockContent = reactRenderWithBlockStructure<
              BType,
              PSchema,
              ContainsInlineContent,
              BSchema
            >(blockConfig.render, block, this.options.editor);

            return <BlockContent />;
          },
          {
            className: blockStyles.reactNodeViewRenderer,
          }
        )(props);
    },
  });

  return {
    node: node,
    propSchema: blockConfig.propSchema,
    serialize: (block, editor) => {
      const blockContentWrapper = document.createElement("div");
      const BlockContent = reactRenderWithBlockStructure<
        BType,
        PSchema,
        ContainsInlineContent,
        BSchema
      >(blockConfig.serialize || blockConfig.render, block, editor as any);
      blockContentWrapper.innerHTML = renderToString(<BlockContent />);

      return {
        dom: blockContentWrapper.firstChild! as HTMLElement,
        contentDOM: blockContentWrapper.getElementsByClassName(
          blockStyles.inlineContent
        )[0],
      };
    },
  };
}
