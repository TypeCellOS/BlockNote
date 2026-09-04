import {
  applyContainerAttributes,
  type ChildrenConfig,
  containerDOMAttributes,
  isContainerConfig,
} from "@blocknote/core";
import {
  BlockConfig,
  BlockConfigOrCreator,
  BlockImplementation,
  BlockNoDefaults,
  BlockNoteEditor,
  BlockSpec,
  camelToDataKebab,
  CustomBlockImplementation,
  Extension,
  ExtensionFactoryInstance,
  ExtractBlockConfigFromConfigOrCreator,
  mergeCSSClasses,
  Props,
  PropSchema,
} from "@blocknote/core";
import {
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useReactNodeView,
} from "@tiptap/react";
import { FC, ReactNode } from "react";
import { renderToDOMSpec } from "./@util/ReactRenderUtil.js";
import { useNodeViewBlock } from "./useNodeViewBlock.js";

// this file is mostly analogoues to `customBlocks.ts`, but for React blocks

export type ReactCustomBlockRenderProps<
  B extends BlockConfigOrCreator,
  Config extends ExtractBlockConfigFromConfigOrCreator<B> =
    ExtractBlockConfigFromConfigOrCreator<B>,
> = {
  block: BlockNoDefaults<Record<Config["type"], Config>, any, any>;
  editor: BlockNoteEditor<Record<Config["type"], Config>, any, any>;
} & (Config["content"] extends "inline" | "plain"
  ? ContentRef
  : // A container block has no content of its own, but its children still
    // render somewhere: the ref marks the slot that holds them.
    undefined extends Config["children"]
    ? object
    : ContentRef);

type ContentRef = {
  contentRef: (node: HTMLElement | null) => void;
};

// extend BlockConfig but use a React render function
export type ReactCustomBlockImplementation<
  B extends BlockConfigOrCreator = BlockConfigOrCreator,
  Config extends ExtractBlockConfigFromConfigOrCreator<B> =
    ExtractBlockConfigFromConfigOrCreator<B>,
> = Omit<
  CustomBlockImplementation<
    Config["type"],
    Config["propSchema"],
    Config["content"]
  >,
  "render" | "toExternalHTML"
> & {
  render: FC<ReactCustomBlockRenderProps<B>>;
  toExternalHTML?: FC<
    ReactCustomBlockRenderProps<B> & {
      context: {
        nestingLevel: number;
      };
    }
  >;
};

export type ReactCustomBlockSpec<
  B extends BlockConfig<string, PropSchema, "inline" | "none" | "plain"> =
    BlockConfig<string, PropSchema, "inline" | "none" | "plain">,
> = {
  config: B;
  implementation: ReactCustomBlockImplementation<B>;
  extensions?: Extension<any>[];
};

// Function that wraps the React component returned from 'blockConfig.render' in
// a `NodeViewWrapper` which also acts as a `blockContent` div. It contains the
// block type and props as HTML attributes.
// Renders a container block outside a node view (serialization). Its element
// *is* the block's element, so it isn't wrapped in a `blockContent` div - it
// carries the marker and props itself.
function renderContainerToDOM<B extends BlockConfig>(
  BlockContent: FC<any>,
  block: any,
  editor: any,
  propSchema: B["propSchema"],
  id: string | undefined,
  context?: any,
) {
  const output = renderToDOMSpec(
    (refCB) => (
      <BlockContent
        block={block}
        editor={editor}
        contentRef={refCB}
        context={context}
      />
    ),
    editor,
  );
  applyContainerAttributes(
    output.dom as HTMLElement,
    block.type,
    containerDOMAttributes(block.props, propSchema, id),
  );
  return output;
}

// Wraps a container block's React component. A container block's node holds
// its children directly, so its element isn't a `blockContent` div: the marker
// and props go on the node view's own element, which the block core stamps.
export function ContainerWrapper(props: { children: ReactNode }) {
  return <NodeViewWrapper>{props.children}</NodeViewWrapper>;
}

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
            return value !== spec.default;
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

/**
 * Helper function to create a React block definition.
 * Can accept either functions that return the required objects, or the objects directly.
 */
export function createReactBlockSpec<
  const TName extends string,
  const TProps extends PropSchema,
  const TContent extends "inline" | "none" | "plain",
  // Carried alongside the three headline types so that what the config
  // declares about its children reaches the implementation: a container
  // block has no content of its own, but its render still places them.
  const TChildren extends ChildrenConfig | undefined = undefined,
  const TOptions extends Record<string, any> | undefined = undefined,
>(
  blockConfigOrCreator: BlockConfig<TName, TProps, TContent> & {
    children?: TChildren;
  },
  blockImplementationOrCreator:
    | ReactCustomBlockImplementation<
        BlockConfig<TName, TProps, TContent> & { children: TChildren }
      >
    | (TOptions extends undefined
        ? () => ReactCustomBlockImplementation<
            BlockConfig<TName, TProps, TContent> & { children: TChildren }
          >
        : (
            options: Partial<TOptions>,
          ) => ReactCustomBlockImplementation<
            BlockConfig<TName, TProps, TContent> & { children: TChildren }
          >),
  extensionsOrCreator?:
    | (ExtensionFactoryInstance | Extension)[]
    | (TOptions extends undefined
        ? () => (ExtensionFactoryInstance | Extension)[]
        : (
            options: Partial<TOptions>,
          ) => (ExtensionFactoryInstance | Extension)[]),
): (options?: Partial<TOptions>) => BlockSpec<TName, TProps, TContent>;
export function createReactBlockSpec<
  const TName extends string,
  const TProps extends PropSchema,
  const TContent extends "inline" | "none" | "plain",
  const BlockConf extends BlockConfig<TName, TProps, TContent>,
  const TOptions extends Partial<Record<string, any>>,
>(
  blockCreator: (options: Partial<TOptions>) => BlockConf,
  blockImplementationOrCreator:
    | ReactCustomBlockImplementation<BlockConf>
    | (TOptions extends undefined
        ? () => ReactCustomBlockImplementation<BlockConf>
        : (
            options: Partial<TOptions>,
          ) => ReactCustomBlockImplementation<BlockConf>),
  extensionsOrCreator?:
    | (ExtensionFactoryInstance | Extension)[]
    | (TOptions extends undefined
        ? () => (ExtensionFactoryInstance | Extension)[]
        : (
            options: Partial<TOptions>,
          ) => (ExtensionFactoryInstance | Extension)[]),
): (
  options?: Partial<TOptions>,
) => BlockSpec<
  BlockConf["type"],
  BlockConf["propSchema"],
  BlockConf["content"]
>;
export function createReactBlockSpec<
  const TName extends string,
  const TProps extends PropSchema,
  const TContent extends "inline" | "none" | "plain",
  const TOptions extends Record<string, any> | undefined = undefined,
>(
  blockConfigOrCreator: BlockConfigOrCreator<TName, TProps, TContent, TOptions>,
  // The overloads above carry the precise types; this signature only has to
  // admit all of them.
  blockImplementationOrCreator:
    | ReactCustomBlockImplementation<any>
    | ((options: Partial<TOptions>) => ReactCustomBlockImplementation<any>),
  extensionsOrCreator?:
    | (ExtensionFactoryInstance | Extension)[]
    | (TOptions extends undefined
        ? () => (ExtensionFactoryInstance | Extension)[]
        : (
            options: Partial<TOptions>,
          ) => (ExtensionFactoryInstance | Extension)[]),
): (options?: Partial<TOptions>) => BlockSpec<TName, TProps, TContent> {
  return (options = {} as TOptions) => {
    const blockConfig =
      typeof blockConfigOrCreator === "function"
        ? blockConfigOrCreator(options as any)
        : blockConfigOrCreator;

    const blockImplementation =
      typeof blockImplementationOrCreator === "function"
        ? blockImplementationOrCreator(options as any)
        : blockImplementationOrCreator;

    const extensions = extensionsOrCreator
      ? typeof extensionsOrCreator === "function"
        ? extensionsOrCreator(options as any)
        : extensionsOrCreator
      : undefined;

    return {
      config: blockConfig,
      implementation: {
        ...blockImplementation,
        toExternalHTML(block, editor, context) {
          const BlockContent =
            blockImplementation.toExternalHTML || blockImplementation.render;
          if (isContainerConfig(blockConfig)) {
            return renderContainerToDOM(
              BlockContent as FC<any>,
              block,
              editor,
              blockConfig.propSchema,
              undefined,
              context,
            );
          }
          const output = renderToDOMSpec((refCB) => {
            return (
              <BlockContentWrapper
                blockType={block.type}
                blockProps={block.props}
                propSchema={blockConfig.propSchema}
                domAttributes={this.blockContentDOMAttributes}
                isFileBlock={
                  blockImplementation.meta?.fileBlockAccept !== undefined
                }
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
                  context={context}
                />
              </BlockContentWrapper>
            );
          }, editor);
          return output;
        },
        render(block, editor) {
          if (this.renderType === "nodeView") {
            // The block core's `addNodeView` resolved when this node view was
            // constructed (itself guarded, via `getBlockFromNodeView`). Seeds
            // the fallback below so there is always something to render.
            const initialBlock = block;

            return ReactNodeViewRenderer(
              (props: NodeViewProps) => {
                // Vanilla JS node views are recreated on each update. However,
                // using `ReactNodeViewRenderer` makes it so the node view is
                // only created once, so the block we get in the node view will
                // be outdated. Therefore, we have to get the block in the
                // `ReactNodeViewRenderer` instead. That position can be stale,
                // so resolving it is guarded (see `useNodeViewBlock`).
                const block = useNodeViewBlock(props, initialBlock);

                const ref = useReactNodeView().nodeViewContentRef;

                if (!ref) {
                  throw new Error("nodeViewContentRef is not set");
                }

                const BlockContent = blockImplementation.render;
                const isContainer = isContainerConfig(blockConfig);
                const Wrapper = isContainer
                  ? ContainerWrapper
                  : ({ children }: { children: ReactNode }) => (
                      <BlockContentWrapper
                        blockType={block.type}
                        blockProps={block.props}
                        propSchema={blockConfig.propSchema}
                        isFileBlock={
                          !!blockImplementation.meta?.fileBlockAccept
                        }
                        domAttributes={this.blockContentDOMAttributes}
                      >
                        {children}
                      </BlockContentWrapper>
                    );
                return (
                  <Wrapper>
                    <BlockContent
                      block={block as any}
                      editor={editor as any}
                      contentRef={(element) => {
                        ref(element);
                        if (element) {
                          // A container block's slot holds blocks, not inline
                          // content, so it isn't marked as the latter.
                          if (!isContainer) {
                            element.className = mergeCSSClasses(
                              "bn-inline-content",
                              element.className,
                            );
                          }
                          element.dataset.nodeViewContent = "";
                        }
                      }}
                    />
                  </Wrapper>
                );
              },
              {
                className: "bn-react-node-view-renderer",
              },
            )(this.props!) as ReturnType<BlockImplementation["render"]>;
          } else {
            const BlockContent = blockImplementation.render;
            if (isContainerConfig(blockConfig)) {
              return renderContainerToDOM(
                BlockContent as FC<any>,
                block,
                editor,
                blockConfig.propSchema,
                block.id,
              );
            }
            const output = renderToDOMSpec((refCB) => {
              return (
                <BlockContentWrapper
                  blockType={block.type}
                  blockProps={block.props}
                  propSchema={blockConfig.propSchema}
                  domAttributes={this.blockContentDOMAttributes}
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
          }
        },
      },
      extensions: extensions,
    };
  };
}
