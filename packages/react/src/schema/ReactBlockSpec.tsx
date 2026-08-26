import { applyContainerAttributes } from "@blocknote/core/internal";
import {
  BlockConfig,
  BlockConfigOrCreator,
  BlockImplementation,
  BlockNoDefaults,
  BlockNoteEditor,
  BlockSpec,
  camelToDataKebab,
  ChildrenConfig,
  CustomBlockImplementation,
  Extension,
  ExtensionFactoryInstance,
  ExtractBlockConfigFromConfigOrCreator,
  mergeCSSClasses,
  nodeToBlock,
  Props,
  PropSchema,
} from "@blocknote/core";
import {
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useReactNodeView,
} from "@tiptap/react";
import { CSSProperties, FC, ReactNode, useLayoutEffect } from "react";
import { renderToDOMSpec } from "./@util/ReactRenderUtil.js";
import { useNodeViewBlock } from "./useNodeViewBlock.js";

// this file is mostly analogoues to `customBlocks.ts`, but for React blocks

// A container block's root element is the block's own element, so every
// wrapper React puts above it has to contribute no box of its own. Module
// scope so the style object is referentially stable across renders.
const DISPLAY_CONTENTS: CSSProperties = { display: "contents" };

export type ReactCustomBlockRenderProps<
  B extends BlockConfigOrCreator,
  Config extends ExtractBlockConfigFromConfigOrCreator<B> =
    ExtractBlockConfigFromConfigOrCreator<B>,
> = {
  block: BlockNoDefaults<Record<Config["type"], Config>, any, any>;
  editor: BlockNoteEditor<Record<Config["type"], Config>, any, any>;
  // A block gets a `contentRef` for its `render` to mount its editable region:
  // its inline content, or, for a container, its child blocks. Only a
  // `content: "none"` block without `children` (and the table block, whose
  // content is managed separately) has nothing to place.
} & (Config extends { children: ChildrenConfig }
  ? { contentRef: (node: HTMLElement | null) => void }
  : Config["content"] extends "inline" | "plain"
    ? { contentRef: (node: HTMLElement | null) => void }
    : object);

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
  // Inferred from the config object itself rather than widened to
  // `BlockConfig<...>`, so `children` survives into the render props and
  // `contentRef` is offered exactly when the block has an editable region.
  const BlockConf extends BlockConfig<TName, TProps, TContent>,
  const TOptions extends Record<string, any> | undefined = undefined,
>(
  blockConfigOrCreator: BlockConf,
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
  blockImplementationOrCreator:
    | ReactCustomBlockImplementation<BlockConfig<TName, TProps, TContent>>
    | (TOptions extends undefined
        ? () => ReactCustomBlockImplementation<
            BlockConfig<TName, TProps, TContent>
          >
        : (
            options: Partial<TOptions>,
          ) => ReactCustomBlockImplementation<
            BlockConfig<TName, TProps, TContent>
          >),
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
          const isContainer = blockConfig.children !== undefined;
          const BlockContent = (blockImplementation.toExternalHTML ||
            blockImplementation.render) as FC<any>;
          const output = renderToDOMSpec((refCB) => {
            const content = (
              <BlockContent
                block={block as any}
                editor={editor as any}
                contentRef={(element: HTMLElement | null) => {
                  refCB(element);
                  if (element && !isContainer) {
                    element.className = mergeCSSClasses(
                      "bn-inline-content",
                      element.className,
                    );
                  }
                }}
                context={context}
              />
            );
            // A container block's render output is the block's root element,
            // with no wrapper. The attributes core stamps afterwards then
            // land on the author's own element, the same element they land
            // on in the live editor.
            return isContainer ? (
              content
            ) : (
              <BlockContentWrapper
                blockType={block.type}
                blockProps={block.props}
                propSchema={blockConfig.propSchema}
                domAttributes={this.blockContentDOMAttributes}
                isFileBlock={
                  blockImplementation.meta?.fileBlockAccept !== undefined
                }
              >
                {content}
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
            // Container-ness is fixed per spec, so the node-view component
            // can be chosen once. Each variant uses only the hooks and
            // wrappers it needs.
            const isContainer = blockConfig.children !== undefined;
            const BlockContent = blockImplementation.render as FC<any>;
            const blockContentDOMAttributes = this.blockContentDOMAttributes;

            // Set by the container node view's `NodeViewWrapper` below. The
            // author's own root element is that wrapper's first element child;
            // it's read lazily because React may not have committed yet when
            // this node view is handed to core, and because the author's
            // component is free to swap its root element on a re-render.
            const wrapper: { current: HTMLElement | null } = { current: null };
            const authorRootDOM = () =>
              (wrapper.current?.firstElementChild as HTMLElement | null) ??
              null;

            // Vanilla JS node views are recreated on each update. However,
            // using `ReactNodeViewRenderer` makes it so the node view is only
            // created once, so the block we get in the node view will be
            // outdated. Therefore, both variants have to (re-)resolve the
            // block inside the `ReactNodeViewRenderer` component.

            const ContainerNodeView = (props: NodeViewProps) => {
              // Container blocks are bnBlock nodes (no `blockContainer`
              // wrapper), so the id lives on the node's own attrs and the
              // block resolves by id. Position-based resolution
              // (`useNodeViewBlock`) would walk up to a parent bnBlock,
              // which is the wrong block here. Ids are also immune to the
              // stale positions it has to guard against.
              const id = (props.node.attrs as Record<string, any>).id;
              if (!id) {
                throw new Error(
                  `Container block "${blockConfig.type}" is missing an id attribute.`,
                );
              }
              // The id lookup misses when the node was just removed from the
              // document (e.g. a suggestion-mode deletion still rendering);
              // fall back to converting the node the view was handed.
              const block =
                editor.getBlock(id) ??
                nodeToBlock(props.node, props.view.state.doc);

              const ref = useReactNodeView().nodeViewContentRef;
              if (!ref) {
                throw new Error("nodeViewContentRef is not set");
              }

              const selected = props.selected;

              // Stamped imperatively rather than spread as JSX props: the root
              // element belongs to the block's author, so there is nothing to
              // spread onto. Runs after every render, since both the block's
              // props and the author's root element can change.
              useLayoutEffect(() => {
                const root = authorRootDOM();
                if (!root) {
                  return;
                }

                applyContainerAttributes(
                  root,
                  blockConfig.type,
                  block.props as any,
                  blockConfig.propSchema,
                  block.id,
                );

                // ProseMirror marks the outermost element with
                // `ProseMirror-selectednode`, but for containers that element
                // has `display: contents`, which suppresses any outline drawn
                // on it. So the state is mirrored onto the author's root,
                // which is the block's actual box.
                if (selected) {
                  root.setAttribute("data-selected", "");
                } else {
                  root.removeAttribute("data-selected");
                }
              });

              return (
                <NodeViewWrapper ref={wrapper} style={DISPLAY_CONTENTS}>
                  <BlockContent
                    block={block as any}
                    editor={editor as any}
                    contentRef={(element: HTMLElement | null) => {
                      ref(element);
                      if (element) {
                        element.dataset.nodeViewContent = "";
                        // Mark the children host of a container so the
                        // round-trip parse rule can scope itself to it (see
                        // `getParseRules`).
                        element.setAttribute(
                          "data-children-of",
                          blockConfig.type,
                        );
                      }
                    }}
                  />
                </NodeViewWrapper>
              );
            };

            const RegularNodeView = (props: NodeViewProps) => {
              // The node view's position can be stale mid-render, so
              // resolving it is guarded (see `useNodeViewBlock`).
              const block = useNodeViewBlock(props, initialBlock);

              const ref = useReactNodeView().nodeViewContentRef;
              if (!ref) {
                throw new Error("nodeViewContentRef is not set");
              }

              return (
                <BlockContentWrapper
                  blockType={block.type}
                  blockProps={block.props}
                  propSchema={blockConfig.propSchema}
                  isFileBlock={!!blockImplementation.meta?.fileBlockAccept}
                  domAttributes={blockContentDOMAttributes}
                >
                  <BlockContent
                    block={block as any}
                    editor={editor as any}
                    contentRef={(element: HTMLElement | null) => {
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
            };

            const nodeView = ReactNodeViewRenderer(
              isContainer ? ContainerNodeView : RegularNodeView,
              {
                // The container class is separate because it removes the
                // box the regular class relies on (see `Block.css`).
                className: isContainer
                  ? "bn-react-node-view-renderer bn-container-node-view"
                  : "bn-react-node-view-renderer",
              },
            )(this.props!) as ReturnType<BlockImplementation["render"]>;

            if (isContainer) {
              // TipTap appends its content host into whichever element the
              // block passed `contentRef` to. `display: contents` keeps that
              // host from contributing a box, so the block's editable region
              // lays out exactly where the author put the ref.
              if (nodeView.contentDOM) {
                nodeView.contentDOM.style.display = "contents";
              }
              // Where core stamps the container attributes: the author's own
              // element, not React's outermost wrapper (`dom`).
              Object.defineProperty(nodeView, "rootDOM", {
                get: authorRootDOM,
              });
            }

            return nodeView;
          } else {
            const isContainer = blockConfig.children !== undefined;
            const BlockContent = blockImplementation.render as FC<any>;
            const output = renderToDOMSpec((refCB) => {
              const content = (
                <BlockContent
                  block={block as any}
                  editor={editor as any}
                  contentRef={(element: HTMLElement | null) => {
                    refCB(element);
                    if (element && !isContainer) {
                      element.className = mergeCSSClasses(
                        "bn-inline-content",
                        element.className,
                      );
                    }
                  }}
                />
              );
              // See `toExternalHTML` above: a container block owns its outer
              // DOM, so its render output is the block's root element.
              return isContainer ? (
                content
              ) : (
                <BlockContentWrapper
                  blockType={block.type}
                  blockProps={block.props}
                  propSchema={blockConfig.propSchema}
                  domAttributes={this.blockContentDOMAttributes}
                >
                  {content}
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
