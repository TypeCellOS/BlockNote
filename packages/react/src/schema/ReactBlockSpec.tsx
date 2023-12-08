import {
  BlockFromConfig,
  BlockNoteEditor,
  BlockSchemaWithBlock,
  camelToDataKebab,
  createInternalBlockSpec,
  createStronglyTypedTiptapNode,
  CustomBlockConfig,
  getBlockFromPos,
  getParseRules,
  inheritedProps,
  InlineContentSchema,
  mergeCSSClasses,
  PartialBlockFromConfig,
  Props,
  PropSchema,
  propsToAttributes,
  StyleSchema,
} from "@blocknote/core";
import {
  NodeViewContent,
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import { FC, ReactNode } from "react";
import { renderToDOMSpec } from "./@util/ReactRenderUtil";

// this file is mostly analogoues to `customBlocks.ts`, but for React blocks

// extend BlockConfig but use a React render function
export type ReactCustomBlockImplementation<
  T extends CustomBlockConfig,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  render: FC<{
    block: BlockFromConfig<T, I, S>;
    editor: BlockNoteEditor<BlockSchemaWithBlock<T["type"], T>, I, S>;
    contentRef: (node: HTMLElement | null) => void;
  }>;
  toExternalHTML?: FC<{
    block: BlockFromConfig<T, I, S>;
    editor: BlockNoteEditor<BlockSchemaWithBlock<T["type"], T>, I, S>;
    contentRef: (node: HTMLElement | null) => void;
  }>;
  parse?: (
    el: HTMLElement
  ) => PartialBlockFromConfig<T, I, S>["props"] | undefined;
};

// Function that wraps the React component returned from 'blockConfig.render' in
// a `NodeViewWrapper` which also acts as a `blockContent` div. It contains the
// block type and props as HTML attributes.
export function BlockContentWrapper<
  BType extends string,
  PSchema extends PropSchema
>(props: {
  blockType: BType;
  blockProps: Props<PSchema>;
  propSchema: PSchema;
  domAttributes?: Record<string, string>;
  children: ReactNode;
}) {
  return (
    // Creates `blockContent` element
    <NodeViewWrapper
      // Adds custom HTML attributes
      {...Object.fromEntries(
        Object.entries(props.domAttributes || {}).filter(
          ([key]) => key !== "class"
        )
      )}
      // Sets blockContent class
      className={mergeCSSClasses(
        "bn-block-content",
        props.domAttributes?.class || ""
      )}
      // Sets content type attribute
      data-content-type={props.blockType}
      // Adds props as HTML attributes in kebab-case with "data-" prefix. Skips
      // props which are already added as HTML attributes to the parent
      // `blockContent` element (inheritedProps) and props set to their default
      // values
      {...Object.fromEntries(
        Object.entries(props.blockProps)
          .filter(
            ([prop, value]) =>
              !inheritedProps.includes(prop) &&
              value !== props.propSchema[prop].default
          )
          .map(([prop, value]) => {
            return [camelToDataKebab(prop), value];
          })
      )}>
      {props.children}
    </NodeViewWrapper>
  );
}

// A function to create custom block for API consumers
// we want to hide the tiptap node from API consumers and provide a simpler API surface instead
export function createReactBlockSpec<
  T extends CustomBlockConfig,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  blockConfig: T,
  blockImplementation: ReactCustomBlockImplementation<T, I, S>
) {
  const node = createStronglyTypedTiptapNode({
    name: blockConfig.type as T["type"],
    content: (blockConfig.content === "inline"
      ? "inline*"
      : "") as T["content"] extends "inline" ? "inline*" : "",
    group: "blockContent",
    selectable: true,

    addAttributes() {
      return propsToAttributes(blockConfig.propSchema);
    },

    parseHTML() {
      return getParseRules(blockConfig, blockImplementation.parse);
    },

    renderHTML() {
      // renderHTML is not really used, as we always use a nodeView, and we use toExternalHTML / toInternalHTML for serialization
      // There's an edge case when this gets called nevertheless; before the nodeviews have been mounted
      // this is why we implement it with a temporary placeholder
      const div = document.createElement("div");
      div.setAttribute("data-tmp-placeholder", "true");
      return {
        dom: div,
      };
    },

    addNodeView() {
      return (props) =>
        ReactNodeViewRenderer(
          (props: NodeViewProps) => {
            // Gets the BlockNote editor instance
            const editor = this.options.editor! as BlockNoteEditor<any>;
            // Gets the block
            const block = getBlockFromPos(
              props.getPos,
              editor,
              this.editor,
              blockConfig.type
            ) as any;
            // Gets the custom HTML attributes for `blockContent` nodes
            const blockContentDOMAttributes =
              this.options.domAttributes?.blockContent || {};

            // hacky, should export `useReactNodeView` from tiptap to get access to ref
            const ref = (NodeViewContent({}) as any).ref;

            const BlockContent = blockImplementation.render;
            return (
              <BlockContentWrapper
                blockType={block.type}
                blockProps={block.props}
                propSchema={blockConfig.propSchema}
                domAttributes={blockContentDOMAttributes}>
                <BlockContent
                  block={block as any}
                  editor={editor as any}
                  contentRef={ref}
                />
              </BlockContentWrapper>
            );
          },
          {
            className: "bn-react-node-view-renderer",
          }
        )(props);
    },
  });

  return createInternalBlockSpec(blockConfig, {
    node: node,
    toInternalHTML: (block, editor) => {
      const blockContentDOMAttributes =
        node.options.domAttributes?.blockContent || {};

      const BlockContent = blockImplementation.render;
      const output = renderToDOMSpec((refCB) => (
        <BlockContentWrapper
          blockType={block.type}
          blockProps={block.props}
          propSchema={blockConfig.propSchema}
          domAttributes={blockContentDOMAttributes}>
          <BlockContent
            block={block as any}
            editor={editor as any}
            contentRef={refCB}
          />
        </BlockContentWrapper>
      ));
      output.contentDOM?.setAttribute("data-editable", "");

      return output;
    },
    toExternalHTML: (block, editor) => {
      const blockContentDOMAttributes =
        node.options.domAttributes?.blockContent || {};

      const BlockContent =
        blockImplementation.toExternalHTML || blockImplementation.render;
      const output = renderToDOMSpec((refCB) => {
        return (
          <BlockContentWrapper
            blockType={block.type}
            blockProps={block.props}
            propSchema={blockConfig.propSchema}
            domAttributes={blockContentDOMAttributes}>
            <BlockContent
              block={block as any}
              editor={editor as any}
              contentRef={refCB}
            />
          </BlockContentWrapper>
        );
      });
      output.contentDOM?.setAttribute("data-editable", "");

      return output;
    },
  });
}
