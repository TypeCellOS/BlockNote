import {
  applyNonSelectableBlockFix,
  BlockConfig,
  BlockFromConfig,
  BlockImplementation,
  BlockNoDefaults,
  BlockNoteEditor,
  BlockNoteExtension,
  BlockSchemaWithBlock,
  BlockSpec,
  camelToDataKebab,
  createTypedBlockSpec,
  createStronglyTypedTiptapNode,
  CustomBlockConfig,
  CustomBlockImplementation,
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
import { NodeView } from "@tiptap/pm/view";
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
  TName extends string = string,
  TProps extends PropSchema = PropSchema,
  TContent extends "inline" | "none" = "inline" | "none",
> = {
  block: BlockNoDefaults<
    Record<TName, BlockConfig<TName, TProps, TContent>>,
    any,
    any
  >;
  editor: BlockNoteEditor<
    Record<TName, BlockConfig<TName, TProps, TContent>>,
    any,
    any
  >;
  contentRef: (node: HTMLElement | null) => void;
};

// extend BlockConfig but use a React render function
export type ReactCustomBlockImplementation<
  TName extends string = string,
  TProps extends PropSchema = PropSchema,
  TContent extends "inline" | "none" = "inline" | "none",
> = Omit<
  CustomBlockImplementation<TName, TProps, TContent>,
  "render" | "toExternalHTML"
> & {
  render: FC<ReactCustomBlockRenderProps<TName, TProps, TContent>>;
  toExternalHTML?: FC<ReactCustomBlockRenderProps<TName, TProps, TContent>>;
};

export type ReactCustomBlockSpec<
  T extends string = string,
  PS extends PropSchema = PropSchema,
  C extends "inline" | "none" = "inline" | "none",
> = {
  config: BlockConfig<T, PS, C>;
  implementation: ReactCustomBlockImplementation<T, PS, C>;
  extensions?: BlockNoteExtension<any>[];
};

// Function that wraps the React component returned from 'blockConfig.render' in
// a `NodeViewWrapper` which also acts as a `blockContent` div. It contains the
// block type and props as HTML attributes.
export function BlockContentWrapper<
  BType extends string,
  PSchema extends PropSchema,
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
      onDragOver={(event: DragEvent) => event.preventDefault()}
      // Adds custom HTML attributes
      {...Object.fromEntries(
        Object.entries(props.domAttributes || {}).filter(
          ([key]) => key !== "class",
        ),
      )}
      // Sets blockContent class
      className={mergeCSSClasses(
        "bn-block-content",
        props.domAttributes?.class || "",
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
          }),
      )}
      data-file-block={props.isFileBlock === true || undefined}
    >
      {props.children}
    </NodeViewWrapper>
  );
}

// A function to create custom block for API consumers
// we want to hide the tiptap node from API consumers and provide a simpler API surface instead
export function createReactBlockSpec<
  const T extends CustomBlockConfig,
  const I extends InlineContentSchema,
  const S extends StyleSchema,
>(
  blockConfig: T,
  blockImplementation: ReactCustomBlockImplementation<T, I, S>,
) {
  const node = createStronglyTypedTiptapNode({
    name: blockConfig.type as T["type"],
    content: (blockConfig.content === "inline"
      ? "inline*"
      : "") as T["content"] extends "inline" ? "inline*" : "",
    group: "blockContent",
    selectable: blockConfig.meta?.selectable ?? true,
    isolating: true,
    addAttributes() {
      return propsToAttributes(blockConfig.propSchema);
    },

    parseHTML() {
      return getParseRules(
        blockConfig,
        blockImplementation.parse,
        blockImplementation.parseContent,
      );
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
        !!blockConfig.meta?.fileBlockAccept,
        HTMLAttributes,
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
              blockConfig.type,
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
                isFileBlock={!!blockConfig.meta?.fileBlockAccept}
                domAttributes={blockContentDOMAttributes}
              >
                <BlockContent
                  block={block as any}
                  editor={editor as any}
                  contentRef={(element) => {
                    ref(element);
                    if (element) {
                      element.className = mergeCSSClasses(
                        "bn-inline-content",
                        element.className,
                      );
                      element.dataset.nodeViewContent = "";
                    }
                  }}
                />
              </BlockContentWrapper>
            );
          },
          {
            className: "bn-react-node-view-renderer",
          },
        )(props) as NodeView;

        if (blockConfig.meta?.selectable === false) {
          applyNonSelectableBlockFix(nodeView, this.editor);
        }

        return nodeView;
      };
    },
  });

  return createInternalBlockSpec(blockConfig, {
    node: node,
    render: (block, editor) => {
      const blockContentDOMAttributes =
        node.options.domAttributes?.blockContent || {};

      const BlockContent = blockImplementation.render;
      const output = renderToDOMSpec(
        (refCB) => (
          <BlockContentWrapper
            blockType={block.type}
            blockProps={block.props}
            propSchema={blockConfig.propSchema}
            domAttributes={blockContentDOMAttributes}
          >
            <BlockContent
              block={block as any}
              editor={editor as any}
              contentRef={(element) => {
                refCB(element);
                if (element) {
                  element.className = mergeCSSClasses(
                    "bn-inline-content",
                    element.className,
                  );
                }
              }}
            />
          </BlockContentWrapper>
        ),
        editor,
      );

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
            domAttributes={blockContentDOMAttributes}
          >
            <BlockContent
              block={block as any}
              editor={editor as any}
              contentRef={(element) => {
                refCB(element);
                if (element) {
                  element.className = mergeCSSClasses(
                    "bn-inline-content",
                    element.className,
                  );
                }
              }}
            />
          </BlockContentWrapper>
        );
      }, editor);

      return output;
    },
  });
}

export function createReactBlockSpec<
  TCallback extends (options?: any) => CustomBlockConfig<any, any>,
  TOptions extends Parameters<TCallback>[0],
  TName extends ReturnType<TCallback>["type"],
  TProps extends ReturnType<TCallback>["propSchema"],
  TContent extends ReturnType<TCallback>["content"],
>(
  callback: TCallback,
): {
  implementation: (
    cb: (
      options?: TOptions,
    ) => ReactCustomBlockImplementation<TName, TProps, TContent>,
    addExtensions?: (options?: TOptions) => BlockNoteExtension<any>[],
  ) => (options?: TOptions) => ReactCustomBlockSpec<TName, TProps, TContent>;
} {
  return {
    implementation: (cb, addExtensions) => (options) => ({
      config: callback(options) as any,
      implementation: cb(options),
      extensions: addExtensions?.(options),
    }),
  };
}
