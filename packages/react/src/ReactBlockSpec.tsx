import {
  BlockConfig,
  BlockNoteDOMAttributes,
  BlockNoteEditor,
  BlockSchema,
  BlockSpec,
  blockStyles,
  camelToDataKebab,
  createTipTapBlock,
  mergeCSSClasses,
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
import { createContext, ElementType, FC, HTMLProps, useContext } from "react";

// extend BlockConfig but use a React render function
export type ReactBlockConfig<
  BType extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean,
  BSchema extends BlockSchema
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

const BlockNoteDOMAttributesContext = createContext<BlockNoteDOMAttributes>({});

export const InlineContent = <Tag extends ElementType>(
  props: { as?: Tag } & HTMLProps<Tag>
) => {
  const inlineContentDOMAttributes =
    useContext(BlockNoteDOMAttributesContext).inlineContent || {};

  const classNames = mergeCSSClasses(
    props.className || "",
    blockStyles.inlineContent,
    inlineContentDOMAttributes.class
  );

  return (
    <NodeViewContent
      {...Object.fromEntries(
        Object.entries(inlineContentDOMAttributes).filter(
          ([key]) => key !== "class"
        )
      )}
      {...props}
      className={classNames}
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
  BSchema extends BlockSchema
>(
  blockConfig: ReactBlockConfig<BType, PSchema, ContainsInlineContent, BSchema>
): BlockSpec<BType, PSchema, ContainsInlineContent> {
  const node = createTipTapBlock<
    BType,
    ContainsInlineContent,
    {
      editor: BlockNoteEditor<BSchema>;
      domAttributes?: BlockNoteDOMAttributes;
    }
  >({
    name: blockConfig.type,
    content: (blockConfig.containsInlineContent
      ? "inline*"
      : "") as ContainsInlineContent extends true ? "inline*" : "",
    selectable: true,

    addAttributes() {
      return propsToAttributes(blockConfig);
    },

    parseHTML() {
      return parse(blockConfig);
    },

    addNodeView() {
      const BlockContent: FC<NodeViewProps> = (props: NodeViewProps) => {
        const Content = blockConfig.render;

        // Add custom HTML attributes
        const blockContentDOMAttributes =
          this.options.domAttributes?.blockContent || {};

        // Add props as HTML attributes in kebab-case with "data-" prefix
        const htmlAttributes: Record<string, string> = {};
        for (const [attribute, value] of Object.entries(props.node.attrs)) {
          if (
            attribute in blockConfig.propSchema &&
            value !== blockConfig.propSchema[attribute].default
          ) {
            htmlAttributes[camelToDataKebab(attribute)] = value;
          }
        }

        // Gets BlockNote editor instance
        const editor = this.options.editor! as BlockNoteEditor<
          BSchema & {
            [k in BType]: BlockSpec<BType, PSchema, ContainsInlineContent>;
          }
        >;
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
            {...Object.fromEntries(
              Object.entries(blockContentDOMAttributes).filter(
                ([key]) => key !== "class"
              )
            )}
            className={mergeCSSClasses(
              blockStyles.blockContent,
              blockContentDOMAttributes.class
            )}
            data-content-type={blockConfig.type}
            {...htmlAttributes}>
            <BlockNoteDOMAttributesContext.Provider
              value={this.options.domAttributes || {}}>
              <Content block={block as any} editor={editor} />
            </BlockNoteDOMAttributesContext.Provider>
          </NodeViewWrapper>
        );
      };
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
