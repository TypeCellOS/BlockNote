import {
  applyNonSelectableBlockFix,
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
  wrapInBlockStructure,
} from "@blocknote/core";
import {
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useReactNodeView,
} from "@tiptap/react";
import { FC, ReactNode } from "react";
import { renderToDOMSpec } from "./@util/ReactRenderUtil.js";

// this file is mostly analogoues to `customBlocks.ts`, but for React blocks

export type ReactCustomBlockRenderProps<
  T extends CustomBlockConfig,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  block: BlockFromConfig<T, I, S>;
  editor: BlockNoteEditor<BlockSchemaWithBlock<T["type"], T>, I, S>;
  contentRef: (node: HTMLElement | null) => void;
};

// extend BlockConfig but use a React render function
export type ReactCustomBlockImplementation<
  T extends CustomBlockConfig,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  render: FC<ReactCustomBlockRenderProps<T, I, S>>;
  toExternalHTML?: FC<ReactCustomBlockRenderProps<T, I, S>>;
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
  isFileBlock?: boolean;
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
          .filter(([prop, value]) => {
            const spec = props.propSchema[prop];
            return !inheritedProps.includes(prop) && value !== spec.default;
          })
          .map(([prop, value]) => {
            return [camelToDataKebab(prop), value];
          })
      )}
      data-file-block={props.isFileBlock === true || undefined}>
      {props.children}
    </NodeViewWrapper>
  );
}

// A function to create custom block for API consumers
// we want to hide the tiptap node from API consumers and provide a simpler API surface instead
export function createReactBlockSpec<
  const T extends CustomBlockConfig,
  const I extends InlineContentSchema,
  const S extends StyleSchema
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
    selectable: blockConfig.isSelectable ?? true,
    isolating: true,
    addAttributes() {
      return propsToAttributes(blockConfig.propSchema);
    },

    parseHTML() {
      return getParseRules(blockConfig, blockImplementation.parse);
    },

    renderHTML({ HTMLAttributes }) {
      // renderHTML is used for copy/pasting content from the editor back into
      // the editor, so we need to make sure the `blockContent` element is
      // structured correctly as this is what's used for parsing blocks. We
      // just render a placeholder div inside as the `blockContent` element
      // already has all the information needed for proper parsing.
      const div = document.createElement("div");
      return wrapInBlockStructure(
        {
          dom: div,
          contentDOM: blockConfig.content === "inline" ? div : undefined,
        },
        blockConfig.type,
        {},
        blockConfig.propSchema,
        blockConfig.isFileBlock,
        HTMLAttributes
      );
    },

    addNodeView() {
      return (props) => {
        const nodeView = ReactNodeViewRenderer(
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

            const ref = useReactNodeView().nodeViewContentRef;

            if (!ref) {
              throw new Error("nodeViewContentRef is not set");
            }

            const BlockContent = blockImplementation.render;
            return (
              <BlockContentWrapper
                blockType={block.type}
                blockProps={block.props}
                propSchema={blockConfig.propSchema}
                isFileBlock={blockConfig.isFileBlock}
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

        if (blockConfig.isSelectable === false) {
          applyNonSelectableBlockFix(nodeView, this.editor);
        }

        return nodeView;
      };
    },
  });

  return createInternalBlockSpec(blockConfig, {
    node: node,
    toInternalHTML: (block, editor) => {
      const blockContentDOMAttributes =
        node.options.domAttributes?.blockContent || {};

      const BlockContent = blockImplementation.render;
      const output = renderToDOMSpec(
        (refCB) => (
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
        ),
        editor
      );
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
      }, editor);
      output.contentDOM?.setAttribute("data-editable", "");

      return output;
    },
  });
}
