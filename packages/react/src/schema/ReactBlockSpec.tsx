import {
  applyLayoutBlockAttributes,
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
  NodeViewWrapper,
  ReactNodeView,
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

// A layout block's root element is the block's own element, so every
// wrapper React puts above it has to contribute no box of its own. Module
// scope so the style object is referentially stable across renders.
const DISPLAY_CONTENTS: CSSProperties = { display: "contents" };

// Marks where a React `toExternalHTML` puts the block's children
// (`childrenRef`), until the export is rendered.
const CHILDREN_MARK = "data-bn-children-ref";

/** The element marked with `CHILDREN_MARK` in `dom`, with the mark removed. */
function takeMarked(dom: HTMLElement): HTMLElement | undefined {
  let marked = dom.querySelector<HTMLElement>(`[${CHILDREN_MARK}]`);
  if (dom.hasAttribute(CHILDREN_MARK)) {
    marked = dom;
  }
  marked?.removeAttribute(CHILDREN_MARK);
  return marked ?? undefined;
}

/**
 * FIXME: This function is a workaround, not a correct solution.
 *
 * Problem: ProseMirror and BlockNote measure the `dom` of a node view. For
 * example, `coordsAtPos`, `posToDOMRect`, the drop cursor, the selection box
 * and scrolling use it. For a React layout block, the `dom` is the wrapper of
 * TipTap. The wrapper has `display: contents`, so it has no box. Without this
 * function, all these measurements give `0,0,0,0`.
 *
 * Workaround: this function replaces two methods of the wrapper,
 * `getBoundingClientRect` and `getClientRects`. The replacements measure the
 * root of the frame. The root is the element of the block in the wrapper.
 *
 * Why it is a workaround:
 * - It changes the behavior of DOM methods on one element. A developer who
 *   does not know this can find the behavior difficult to understand.
 * - Other measurements of the wrapper stay incorrect: `offsetTop`,
 *   `offsetHeight`, `IntersectionObserver`, `ResizeObserver`, and
 *   `scrollIntoView` on the wrapper.
 * - Before React draws the root, the box of the wrapper is still empty.
 *
 * Correct solution: make the root of the frame the `dom` of the node view.
 * React draws the root after ProseMirror makes the node view, so this needs
 * more work. See the review of #3059 (thread r4084731902).
 */
function measureFrameRoot(wrapper: HTMLElement, blockId: () => string) {
  function measured(): Element {
    // The root is before the child blocks, so it is the first element with
    // an ID. React puts the ID of the block on the root.
    const root = wrapper.querySelector("[data-id]");
    return root?.getAttribute("data-id") === blockId() ? root : wrapper;
  }
  wrapper.getBoundingClientRect = () =>
    Element.prototype.getBoundingClientRect.call(measured());
  wrapper.getClientRects = () =>
    Element.prototype.getClientRects.call(measured());
}

export type ReactCustomBlockRenderProps<
  B extends BlockConfigOrCreator,
  Config extends ExtractBlockConfigFromConfigOrCreator<B> =
    ExtractBlockConfigFromConfigOrCreator<B>,
> = {
  block: BlockNoDefaults<Record<Config["type"], Config>, any, any>;
  editor: BlockNoteEditor<Record<Config["type"], Config>, any, any>;
  // A block with content gets a `contentRef` to mount its editable region.
  // A block without content (and the table block, whose content is managed
  // separately) has nothing to place.
} & (Config["content"] extends "inline" | "plain"
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
  // A frame gets a `slotRef` for its slot: the mount for a layout block's
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
  // Every block declares `render`, except a layout block, which declares only
  // `renderFrame`. FIXME: checked at runtime (`validateRenderHooks`); the
  // types could require exactly one, as `Config` shows `layoutOnly` here.
  render?: FC<ReactCustomBlockRenderProps<B>>;
  // The frame around a block's content and its children, or a layout block's
  // only element. Its slot holds the content followed by the children (a
  // layout block: only the children).
  renderFrame?: FC<ReactCustomBlockFrameProps<B>>;
  // Like core's `toExternalHTML`, which returns `contentDOM` and
  // `childrenDOM`: `contentRef` marks where the block's content goes, and
  // `childrenRef` where its children go. Without `childrenRef`, the children
  // follow the block.
  toExternalHTML?: FC<
    ReactCustomBlockRenderProps<B> & {
      childrenRef: (node: HTMLElement | null) => void;
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
 * frame node view (incl. a layout block's).
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

    // Being a layout block is fixed per spec, so every render path can decide once.
    // A titled block (content of its own plus `children`) keeps its ordinary
    // shape: only a contentless block builds a layout block node, so only one
    // takes the layout block node view. The titled block's content node renders
    // through the regular node view; core installs its frame at the
    // `blockContainer` level (see the `renderFrame` adapter below).
    const isLayoutBlock = blockConfig.layoutOnly === true;

    // Shared by the two paths that render to plain DOM: `toExternalHTML`, and
    // `render` outside a node view (a layout block has no `render`). A layout block
    // block's export is the block's root element, with no wrapper: the props
    // core adds afterwards land on the author's own element.
    function renderStatic(args: {
      BlockContent: FC<any>;
      block: any;
      editor: any;
      domAttributes?: Record<string, string>;
      isFileBlock?: boolean;
      context?: any;
      childrenRef?: (element: HTMLElement | null) => void;
    }) {
      const { BlockContent, block, editor } = args;

      return renderToDOMSpec((refCB) => {
        const content = (
          <BlockContent
            block={block as any}
            editor={editor as any}
            childrenRef={args.childrenRef}
            contentRef={(element: HTMLElement | null) => {
              refCB(element);
              if (element && !isLayoutBlock) {
                element.className = mergeCSSClasses(
                  "bn-inline-content",
                  element.className,
                );
              }
            }}
            context={args.context}
          />
        );

        return isLayoutBlock ? (
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

    // Marks a layout block's slot for the parser and puts the block's attributes
    // on its frame's root, the block's element.
    function stampLayoutFrame(
      slot: HTMLElement,
      block: Block<any, any, any>,
      selected: boolean,
    ) {
      markFrameSlot(slot);
      const root = slot.closest("[data-node-view-wrapper]")?.firstElementChild;
      if (!(root instanceof HTMLElement)) {
        throw new Error(
          "Layout block content must be inside its node view wrapper.",
        );
      }
      applyLayoutBlockAttributes(
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
      // layout block node), so its node is the block.
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
      // A layout block's frame root is its block's element, so it carries the
      // block's attributes, kept current after every render.
      const latest = useRef({ block, selected: props.selected });
      useLayoutEffect(() => {
        latest.current = { block, selected: props.selected };
        if (isLayoutBlock && slot.current) {
          stampLayoutFrame(slot.current, block, props.selected);
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
          // layout block's frame never declines, so it has no default wrapper.
          mountContent(element ?? (isLayoutBlock ? null : wrapper.current));
          // Also when author state replaces the frame's root or slot.
          if (isLayoutBlock && element) {
            stampLayoutFrame(
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
          // node view, so core can't tell it is unframed. A declined vanilla
          // frame gives no frame (`vanillaFrameView`), and the block keeps
          // `.bn-block`. Lift declining out of the component.
          if (!slot.current && !isLayoutBlock) {
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
            const output = renderStatic({
              BlockContent: ReactToExternalHTML,
              block,
              editor,
              domAttributes: this.blockContentDOMAttributes,
              isFileBlock:
                blockImplementation.meta?.fileBlockAccept !== undefined,
              context,
              // Marks the element the export puts the children in. The
              // rendered DOM is cloned, so the clone is found by the mark.
              childrenRef: (element) =>
                element?.setAttribute(CHILDREN_MARK, ""),
            });
            return { ...output, childrenDOM: takeMarked(output.dom) };
          },
        }),
        // A layout block has no `render`: it draws only its frame, and core
        // builds its node view around its `frameView`.
        ...(ReactRender &&
          ({
            render(block, editor) {
              // TODO: `render` does two jobs here, picked by `renderType`: the
              // live node view (built from `this.props`) and the static render.
              // Frames keep them apart: `renderFrame` only draws, and React
              // supplies the frame's view through the internal `frameView` hook.
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
              // The frame in the editor: TipTap renders React only through a
              // node view, so this draws one and hands core its frame parts.
              // Core owns the block's node view.
              frameView: (props) => {
                const nodeView = ReactNodeViewRenderer(FrameNodeView, {
                  // Separate from the regular class, because it removes the
                  // box that one relies on (see `Block.css`).
                  className: "bn-react-node-view-renderer bn-frame-node-view",
                })(props);
                // TipTap returns no node view when the editor has no React
                // content component (a headless editor), which never draws
                // node views.
                if (!(nodeView instanceof ReactNodeView)) {
                  throw new Error(
                    "React frames need an editor that renders React node views.",
                  );
                }
                // Read once: TipTap's `dom` getter throws whenever its
                // wrapper element isn't rendered, e.g. while unmounting.
                const dom = nodeView.dom;
                const slot = nodeView.contentDOM;
                if (!slot) {
                  throw new Error("React frame node view has no content DOM.");
                }
                if (isLayoutBlock) {
                  // A layout block's slot determines layout, not TipTap's host.
                  slot.style.display = "contents";
                  // FIXME: workaround. The `dom` of a layout block is the wrapper
                  // of TipTap, which has no box (see `measureFrameRoot`).
                  measureFrameRoot(dom, () => nodeView.node.attrs.id);
                }
                return {
                  dom,
                  slot,
                  // TipTap keeps the node it shows, and changes it only when
                  // it keeps the view.
                  get node() {
                    return nodeView.node;
                  },
                  update(node, decorations, innerDecorations) {
                    // A frame belongs to one block type. A regular block's
                    // node is its `blockContainer`, so its type is the type
                    // of the content node. (A layout block's node is the block
                    // itself, so ProseMirror never offers it another type.)
                    if (
                      !isLayoutBlock &&
                      node.firstChild?.type !== nodeView.node.firstChild?.type
                    ) {
                      // The block's type changed. Return `false`: the node
                      // view draws the block again, with the frame of the
                      // new type.
                      return false;
                    }
                    // TipTap gives the new node to the React frame. Return
                    // `true`: the node view keeps the frame.
                    return nodeView.update(node, decorations, innerDecorations);
                  },
                  // React shows the selection (`props.selected`).
                  selectNode: () => nodeView.selectNode(),
                  deselectNode: () => nodeView.deselectNode(),
                  destroy: () => nodeView.destroy(),
                };
              },
            } satisfies Pick<
              BlockImplementation<TName, TProps, TContent>,
              "renderFrame" | "frameView"
            >)
          : {}),
      },
      extensions: extensions,
    };
  };
}
