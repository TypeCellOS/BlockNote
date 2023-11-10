import {
  BlockConfig,
  BlockNoteDOMAttributes,
  BlockNoteEditor,
  BlockSchemaWithBlock,
  BlockSpec,
  camelToDataKebab,
  createTipTapBlock,
  getBlockFromPos,
  mergeCSSClasses,
  parse,
  Props,
  PropSchema,
  propsToAttributes,
  SpecificBlock,
  wrapInBlockStructure,
} from "@blocknote/core";
import {
  NodeViewContent,
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import { renderToString } from "react-dom/server";
import { createContext, ElementType, FC, HTMLProps, useContext } from "react";

// extend BlockConfig but use a React render function
export type ReactBlockConfig<
  BType extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean,
  BSchema extends BlockSchemaWithBlock<BType, PSchema, ContainsInlineContent>
> = Omit<
  BlockConfig<BType, PSchema, ContainsInlineContent, BSchema>,
  "render"
> & {
  render: FC<{
    block: Parameters<
      BlockConfig<BType, PSchema, ContainsInlineContent, BSchema>["render"]
    >[0];
    editor: Parameters<
      BlockConfig<BType, PSchema, ContainsInlineContent, BSchema>["render"]
    >[1];
  }>;
};

const BlockNoteDOMAttributesContext = createContext<BlockNoteDOMAttributes>({});

export const InlineContent = <Tag extends ElementType>(
  props: { as?: Tag } & HTMLProps<Tag>
) => {
  const inlineContentDOMAttributes =
    useContext(BlockNoteDOMAttributesContext).inlineContent || {};

  const classNames = mergeCSSClasses(
    props.className || "",
    "bn-inline-content",
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
export function reactWrapInBlockStructure<
  BType extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean,
  BSchema extends BlockSchemaWithBlock<BType, PSchema, ContainsInlineContent>
>(
  element: JSX.Element,
  block: SpecificBlock<BSchema, BType>,
  domAttributes?: Record<string, string>
) {
  return () => (
    // Creates `blockContent` element
    <NodeViewWrapper
      // Adds custom HTML attributes
      {...Object.fromEntries(
        Object.entries(domAttributes || {}).filter(([key]) => key !== "class")
      )}
      // Sets blockContent class
      className={mergeCSSClasses(
        "bn-block-content",
        domAttributes?.class || ""
      )}
      // Sets content type attribute
      data-content-type={block.type}
      // Add props as HTML attributes in kebab-case with "data-" prefix
      {...Object.fromEntries(
        Object.entries(block.props).map(([prop, value]) => {
          return [camelToDataKebab(prop), value];
        })
      )}>
      {element}
    </NodeViewWrapper>
  );
}

// A function to create custom block for API consumers
// we want to hide the tiptap node from API consumers and provide a simpler API surface instead
export function createReactBlockSpec<
  BType extends string,
  PSchema extends PropSchema,
  ContainsInlineContent extends boolean,
  BSchema extends BlockSchemaWithBlock<BType, PSchema, ContainsInlineContent>
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
      return (props) =>
        ReactNodeViewRenderer(
          (props: NodeViewProps) => {
            // Gets the BlockNote editor instance
            const editor = this.options.editor! as BlockNoteEditor<
              BSchema & {
                [k in BType]: BlockSpec<BType, PSchema, ContainsInlineContent>;
              }
            >;
            // Gets the block
            const block = getBlockFromPos<
              BType,
              PSchema,
              ContainsInlineContent,
              BSchema
            >(props.getPos, editor, this.editor, blockConfig.type);
            // Gets the custom HTML attributes for `blockContent` nodes
            const blockContentDOMAttributes =
              this.options.domAttributes?.blockContent || {};

            const Content = blockConfig.render;
            const BlockContent = reactWrapInBlockStructure(
              <Content block={block} editor={editor} />,
              block,
              blockContentDOMAttributes
            );

            return <BlockContent />;
          },
          {
            className: "bn-react-node-view-renderer",
          }
        )(props);
    },
  });

  return {
    node: node,
    propSchema: blockConfig.propSchema,
    toInternalHTML: (block, editor) => {
      const blockContentDOMAttributes =
        node.options.domAttributes?.blockContent || {};

      const Content = blockConfig.render;
      const BlockContent = reactWrapInBlockStructure(
        <Content block={block as any} editor={editor as any} />,
        block,
        blockContentDOMAttributes
      );
      const element = document.createElement("div");
      element.innerHTML = renderToString(<BlockContent />);

      return wrapInBlockStructure<BType, PSchema>(
        { dom: element },
        block.type as BType,
        block.props as Props<PSchema>,
        blockConfig.propSchema,
        blockContentDOMAttributes
      ).dom;
    },
    toExternalHTML: (block, editor) => {
      const blockContentDOMAttributes =
        node.options.domAttributes?.blockContent || {};

      let element: HTMLElement;

      if (blockConfig.toExternalHTML !== undefined) {
        element = blockConfig.toExternalHTML(block as any, editor as any);
      } else {
        const Content = blockConfig.render;
        const BlockContent = reactWrapInBlockStructure(
          <Content block={block as any} editor={editor as any} />,
          block,
          blockContentDOMAttributes
        );
        element = document.createElement("div");
        element.innerHTML = renderToString(<BlockContent />);
      }

      return wrapInBlockStructure<BType, PSchema>(
        { dom: element },
        block.type as BType,
        block.props as Props<PSchema>,
        blockConfig.propSchema,
        blockContentDOMAttributes
      ).dom;
    },
  };
}
