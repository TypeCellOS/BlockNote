import {
  applyContainerAttributes,
  Block,
  BlockConfig,
  BlockFromConfig,
  BlockConfigOrCreator,
  BlockImplementation,
  BlockNoDefaults,
  BlockNoteEditor,
  BlockSpec,
  CustomBlockImplementation,
  Extension,
  ExtensionFactoryInstance,
  ExtractBlockConfigFromConfigOrCreator,
  markFrameSlot,
  mergeCSSClasses,
  nodeToBlock,
  Props,
  PropSchema,
  propsToDataAttributes,
  validateRenderHooks,
} from "@blocknote/core";
import {
  NodeViewProps,
  NodeViewRenderer,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useReactNodeView,
} from "@tiptap/react";
import {
  CSSProperties,
  FC,
  ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
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
  // its inline content, or, for a container's `toExternalHTML`, its child
  // blocks. Only a `content: "none"` block that isn't a container (and the
  // table block, whose content is managed separately) has nothing to place.
  // FIXME: a container has no `render`, and its `toExternalHTML` could take
  // `slotRef` like its frame.
} & (Config extends { container: true }
  ? { contentRef: (node: HTMLElement | null) => void }
  : Config["content"] extends "inline" | "plain"
    ? { contentRef: (node: HTMLElement | null) => void }
    : object);

// The props of a React `renderFrame` component.
export type ReactCustomBlockFrameProps<
  B extends BlockConfigOrCreator,
  Config extends ExtractBlockConfigFromConfigOrCreator<B> =
    ExtractBlockConfigFromConfigOrCreator<B>,
> = {
  block: BlockFromConfig<Config, any, any>;
  editor: BlockNoteEditor<Record<Config["type"], Config>, any, any>;
  // A frame gets a `slotRef` for its slot: the mount for a container's
  // children, or for a block's content and children together. Attach it
  // with `ref={slotRef}` on the slot element.
  slotRef: (node: HTMLElement | null) => void;
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
  // Every block declares `render`, except a container, which declares only
  // `renderFrame`. FIXME: checked at runtime (`validateRenderHooks`); the
  // types could require exactly one, as `Config` shows `container` here.
  render?: FC<ReactCustomBlockRenderProps<B>>;
  // The frame around a block's content and its children, or a container's
  // only element. Its slot holds the content followed by the children (a
  // container: only the children).
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
      // Adds the props as `data-*` attributes, leaving out those at their default.
      {...propsToDataAttributes(props.blockProps, props.propSchema)}
      data-file-block={props.isFileBlock === true || undefined}
    >
      {props.children}
    </NodeViewWrapper>
  );
}

/**
 * Helper function to create a React block definition.
 * Can accept either functions that return the required objects, or the objects directly.
 *
 * FIXME: hard to read (review thread on `createReactBlockSpec`). Split into
 * named top-level functions: static content, content node view, static frame,
 * frame node view (incl. a container's).
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

    validateRenderHooks(blockConfig, blockImplementation);

    const {
      render: ReactRender,
      renderFrame: reactRenderFrame,
      toExternalHTML: ReactToExternalHTML,
      ...coreImplementation
    } = blockImplementation;

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
    const isContainer = blockConfig.container === true;

    // Shared by the two paths that render to plain DOM: `toExternalHTML`, and
    // `render` outside a node view (a container has no `render`). A container
    // block's export is the block's root element, with no wrapper: the props
    // core adds afterwards land on the author's own element.
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

    // Marks a container's slot for the parser and puts the block's attributes
    // on its frame's root, the block's element.
    function stampContainerFrame(
      slot: HTMLElement,
      block: Block<any, any, any>,
      selected: boolean,
    ) {
      markFrameSlot(slot);
      const root = slot.closest("[data-node-view-wrapper]")?.firstElementChild;
      if (!(root instanceof HTMLElement)) {
        throw new Error(
          "Container content must be inside its node view wrapper.",
        );
      }
      applyContainerAttributes(
        root,
        blockConfig.type,
        block.props,
        blockConfig.propSchema,
        block.id,
      );
      root.toggleAttribute("data-selected", selected);
    }

    function FrameNodeView(props: NodeViewProps) {
      // This view belongs to the block's own node (the blockContainer, or the
      // container node), so its node is the block.
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
      // A container's frame root is its block's element, so it carries the
      // block's attributes, kept current after every render.
      const latest = useRef({ block, selected: props.selected });
      useLayoutEffect(() => {
        latest.current = { block, selected: props.selected };
        if (isContainer && slot.current) {
          stampContainerFrame(slot.current, block, props.selected);
        }
      });
      const contentRef = useCallback(
        (element: HTMLElement | null) => {
          slot.current = element;
          if (element) {
            element.dataset.nodeViewContent = "";
          }
          // TipTap owns contentDOM and preserves it as a conditional frame
          // switches between author markup and the default wrapper. A
          // container's frame never declines, so it has no default wrapper.
          mountContent(element ?? (isContainer ? null : wrapper.current));
          // Also when author state replaces the frame's root or slot.
          if (isContainer && element) {
            stampContainerFrame(
              element,
              latest.current.block,
              latest.current.selected,
            );
          }
        },
        [mountContent],
      );
      const wrapperRef = useCallback(
        (element: HTMLDivElement | null) => {
          wrapper.current = element;
          // TODO: a declined React frame falls back to this wrapper inside the
          // node view, so core's `createFrameView` can't tell it is unframed.
          // Lift declining out of the component when `createFrameView`
          // returns `NodeView | undefined` (review cluster A).
          if (!slot.current && !isContainer) {
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
            slotRef={contentRef}
          />
        </NodeViewWrapper>
      );
    }

    return {
      config: blockConfig,
      implementation: {
        ...coreImplementation,
        // Only a block with its own export has `toExternalHTML`. Without
        // one, the external HTML serializer makes the default export.
        ...(ReactToExternalHTML && {
          toExternalHTML(
            this: ThisParameterType<
              NonNullable<BlockImplementation["toExternalHTML"]>
            >,
            block: any,
            editor: any,
            context: { nestingLevel: number },
          ) {
            return renderStatic({
              BlockContent: ReactToExternalHTML,
              block,
              editor,
              domAttributes: this.blockContentDOMAttributes,
              isFileBlock:
                blockImplementation.meta?.fileBlockAccept !== undefined,
              context,
            });
          },
        }),
        // A container has no `render`: it draws only its frame, and core
        // builds its node view through `frameNodeView`.
        ...(ReactRender &&
          ({
            render(block, editor) {
              // TODO: `render` does two jobs here, picked by `renderType`: the
              // live node view (built from `this.props`) and the static render.
              // Frames keep them apart: `renderFrame` only draws, and React
              // supplies the live node view through the internal `frameNodeView`.
              // Do the same for content (an internal node view hook that core's
              // `blockNodeView` uses when present), so `render` is static only
              // and nothing in BlockNote needs `renderType` / `this.props`.
              if (this.renderType === "nodeView") {
                // The block core's `addNodeView` resolved when this node view was
                // constructed (itself guarded, via `getBlockFromNodeView`). Seeds
                // the fallback below so there is always something to render.
                const initialBlock = block;
                const BlockContent = ReactRender;
                const blockContentDOMAttributes =
                  this.blockContentDOMAttributes;

                function BlockNodeView(props: NodeViewProps) {
                  const block = useNodeViewBlock(props, initialBlock);
                  const ref = useReactNodeView().nodeViewContentRef;
                  if (!ref) {
                    throw new Error("nodeViewContentRef is not set");
                  }

                  const mountContent = ref;
                  function contentRef(element: HTMLElement | null) {
                    mountContent(element);
                    if (!element) {
                      return;
                    }
                    element.dataset.nodeViewContent = "";
                    element.className = mergeCSSClasses(
                      "bn-inline-content",
                      element.className,
                    );
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
                        contentRef={contentRef}
                      />
                    </BlockContentWrapper>
                  );
                }

                return ReactNodeViewRenderer(BlockNodeView, {
                  className: "bn-react-node-view-renderer",
                })(this.props!) as ReturnType<
                  NonNullable<BlockImplementation["render"]>
                >;
              } else {
                return renderStatic({
                  BlockContent: ReactRender,
                  block,
                  editor,
                  domAttributes: this.blockContentDOMAttributes,
                });
              }
            },
          } satisfies Pick<
            BlockImplementation<TName, TProps, TContent>,
            "render"
          >)),
        ...(Frame
          ? ({
              // Serialization uses the same component through the existing
              // static renderer. Live rendering uses the outer node view below.
              renderFrame(block, editor) {
                const { dom, contentDOM } = renderToDOMSpec(
                  (slotRef) => (
                    <Frame block={block} editor={editor} slotRef={slotRef} />
                  ),
                  editor,
                );
                return contentDOM ? { dom, slot: contentDOM } : undefined;
              },
              frameNodeView: (props) => {
                const nodeView = ReactNodeViewRenderer(FrameNodeView, {
                  // Separate from the regular class, because it removes the
                  // box that one relies on (see `Block.css`).
                  className:
                    "bn-react-node-view-renderer bn-container-node-view",
                })(props) as { contentDOM?: HTMLElement | null };
                // A container's slot determines layout, not TipTap's host.
                if (isContainer && nodeView.contentDOM) {
                  nodeView.contentDOM.style.display = "contents";
                }
                return nodeView as ReturnType<NodeViewRenderer>;
              },
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
