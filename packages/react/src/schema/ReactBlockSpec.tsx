import {
  applyContainerAttributes,
  isContainerConfig,
  BlockConfig,
  BlockFromConfig,
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
import { CSSProperties, FC, ReactNode, useCallback, useRef } from "react";
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
export type ReactCustomBlockFrameProps<
  B extends BlockConfigOrCreator,
  Config extends ExtractBlockConfigFromConfigOrCreator<B> =
    ExtractBlockConfigFromConfigOrCreator<B>,
> = {
  block: BlockFromConfig<Config, any, any>;
  editor: BlockNoteEditor<Record<Config["type"], Config>, any, any>;
  // A frame gets a `contentRef` for its slot: the mount for the block's
  // children, or for its content and children together when the block is a
  // titled block (content of its own plus `children`). Attach it with
  // `ref={contentRef}` on the slot element, the same way `render` mounts
  // its editable region.
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
  "render" | "renderFrame" | "toExternalHTML"
> & {
  render: FC<ReactCustomBlockRenderProps<B>>;
  // The outer block node view renders this component live. Its slot holds
  // the existing content node followed by the child blockGroup, regardless
  // of whether those children are owned or ordinary nesting.
  renderFrame?: FC<ReactCustomBlockFrameProps<B>>;
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

    if (!blockImplementation.render) {
      throw new Error(`Block "${blockConfig.type}" must declare \`render\`.`);
    }

    const { renderFrame: reactRenderFrame, ...coreImplementation } =
      blockImplementation;

    const extensions = extensionsOrCreator
      ? typeof extensionsOrCreator === "function"
        ? extensionsOrCreator(options as any)
        : extensionsOrCreator
      : undefined;

    // Container-ness is fixed per spec, so every render path can decide once.
    // A titled block (content of its own plus `children`) keeps its ordinary
    // shape: only a contentless block builds a container node, so only one
    // takes the container node view. The titled block's content node renders
    // through the regular node view; core installs its frame at the
    // `blockContainer` level (see the `renderFrame` adapter below).
    const isContainer = isContainerConfig(blockConfig);

    // Shared by the two paths that render to plain DOM (`toExternalHTML` and
    // `render` outside a node view). A container block's output is the
    // block's root element, with no wrapper: the attributes core stamps
    // afterwards then land on the author's own element, the same element they
    // land on in the live editor.
    function renderStatic(args: {
      BlockContent: FC<any>;
      block: any;
      editor: any;
      domAttributes?: Record<string, string>;
      isFileBlock?: boolean;
      context?: any;
    }) {
      const { BlockContent, block, editor } = args;

      return renderToDOMSpec((refCB) => {
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
            context={args.context}
          />
        );

        return isContainer ? (
          content
        ) : (
          <BlockContentWrapper
            blockType={block.type}
            blockProps={block.props}
            propSchema={blockConfig.propSchema}
            domAttributes={args.domAttributes}
            isFileBlock={args.isFileBlock}
          >
            {content}
          </BlockContentWrapper>
        );
      }, editor);
    }

    const Frame = reactRenderFrame;

    function FrameNodeView(props: NodeViewProps) {
      // This view belongs to blockContainer itself, so its node is the block.
      const block = nodeToBlock(props.node, props.view.state.doc);
      if (block.type !== blockConfig.type) {
        throw new Error(
          `Frame for "${blockConfig.type}" received block "${block.type}".`,
        );
      }
      const mountContent = useReactNodeView().nodeViewContentRef;
      const wrapper = useRef<HTMLDivElement | null>(null);
      const slot = useRef<HTMLElement | null>(null);
      if (!mountContent || !Frame) {
        throw new Error("Frame node view requires a frame and content mount.");
      }
      const contentRef = useCallback(
        (element: HTMLElement | null) => {
          slot.current = element;
          if (element) {
            element.dataset.nodeViewContent = "";
          }
          // TipTap owns contentDOM and preserves it as a conditional frame
          // switches between author markup and the default wrapper.
          mountContent(element ?? wrapper.current);
        },
        [mountContent],
      );
      const wrapperRef = useCallback(
        (element: HTMLDivElement | null) => {
          wrapper.current = element;
          if (!slot.current) {
            mountContent(element);
          }
        },
        [mountContent],
      );

      return (
        <NodeViewWrapper ref={wrapperRef} style={DISPLAY_CONTENTS}>
          <Frame
            // The outer node view checks the content type before reusing this
            // renderer; the schema supplies the corresponding props/content.
            block={
              block as unknown as ReactCustomBlockFrameProps<
                typeof blockConfig
              >["block"]
            }
            editor={props.extension.options.editor}
            contentRef={contentRef}
          />
        </NodeViewWrapper>
      );
    }

    return {
      config: blockConfig,
      implementation: {
        ...coreImplementation,
        toExternalHTML(block, editor, context) {
          if (!blockImplementation.toExternalHTML) {
            return undefined;
          }
          return renderStatic({
            BlockContent: blockImplementation.toExternalHTML,
            block,
            editor,
            domAttributes: this.blockContentDOMAttributes,
            isFileBlock:
              blockImplementation.meta?.fileBlockAccept !== undefined,
            context,
          });
        },
        render(block, editor) {
          if (this.renderType === "nodeView") {
            // The block core's `addNodeView` resolved when this node view was
            // constructed (itself guarded, via `getBlockFromNodeView`). Seeds
            // the fallback below so there is always something to render.
            const initialBlock = block;
            // Each node-view variant uses only the hooks and wrappers it
            // needs, so the component is chosen once from `isContainer`.
            const BlockContent = blockImplementation.render as FC<any>;
            const blockContentDOMAttributes = this.blockContentDOMAttributes;

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
              // Converted from the node the view was handed rather than
              // looked up by id: the conversion is cached per node, while a
              // lookup would scan the whole document on every render, and it
              // also covers a node that was just removed from the document
              // (e.g. a suggestion-mode deletion still rendering).
              const block = nodeToBlock(props.node, props.view.state.doc);

              const ref = useReactNodeView().nodeViewContentRef;
              if (!ref) {
                throw new Error("nodeViewContentRef is not set");
              }

              const mountContent = ref;

              // A replaced author root also remounts its content slot. Handle
              // both there, including commits driven by the author's own state.
              // The containing wrapper is already in the DOM during ref attach.
              function mountChildren(element: HTMLElement | null) {
                mountContent(element);
                if (!element) {
                  return;
                }
                element.dataset.nodeViewContent = "";
                element.setAttribute("data-children-of", blockConfig.type);
                const root = element.closest(
                  "[data-node-view-wrapper]",
                )?.firstElementChild;
                if (!(root instanceof HTMLElement)) {
                  throw new Error(
                    "Container content must be inside its node view wrapper.",
                  );
                }
                applyContainerAttributes<PropSchema>(
                  root,
                  blockConfig.type,
                  block.props,
                  blockConfig.propSchema,
                  block.id,
                );
                root.toggleAttribute("data-selected", props.selected);
              }

              return (
                <NodeViewWrapper style={DISPLAY_CONTENTS}>
                  <BlockContent
                    block={block as any}
                    editor={editor as any}
                    contentRef={mountChildren}
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
            )(this.props!) as ReturnType<
              NonNullable<BlockImplementation["render"]>
            >;

            if (isContainer) {
              // TipTap appends its content host into whichever element the
              // block passed `contentRef` to. `display: contents` keeps that
              // host from contributing a box, so the block's editable region
              // lays out exactly where the author put the ref.
              if (nodeView.contentDOM) {
                nodeView.contentDOM.style.display = "contents";
              }
              // The content ref stamps the author's root when it mounts;
              // core also maintains the stable node-view wrapper attributes.
            }

            return nodeView;
          } else {
            return renderStatic({
              BlockContent: blockImplementation.render,
              block,
              editor,
              domAttributes: this.blockContentDOMAttributes,
            });
          }
        },
        ...(Frame
          ? ({
              // Serialization uses the same component through the existing
              // static renderer. Live rendering uses the outer node view below.
              renderFrame(block, editor) {
                const { dom, contentDOM } = renderToDOMSpec(
                  (contentRef) => (
                    <Frame
                      block={block}
                      editor={editor}
                      contentRef={contentRef}
                    />
                  ),
                  editor,
                );
                return contentDOM ? { dom, slot: contentDOM } : undefined;
              },
              frameNodeView: ReactNodeViewRenderer(FrameNodeView, {
                className: "bn-react-node-view-renderer bn-container-node-view",
              }),
            } satisfies Pick<
              BlockImplementation<TName, TProps, TContent>,
              "renderFrame" | "frameNodeView"
            >)
          : {}),
      },
      extensions: extensions,
    };
  };
}
