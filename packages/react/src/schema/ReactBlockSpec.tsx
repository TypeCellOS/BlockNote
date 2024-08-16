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
import { NodeView } from "@tiptap/core";
import {
  NodeViewContent,
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
// TODO: Fix import
import { NodeSelection } from "prosemirror-state";
import { FC, ReactNode } from "react";
import { renderToDOMSpec } from "./@util/ReactRenderUtil";

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
          .filter(
            ([prop, value]) =>
              !inheritedProps.includes(prop) &&
              value !== props.propSchema[prop].default
          )
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

            // hacky, should export `useReactNodeView` from tiptap to get access to ref
            const ref = (NodeViewContent({}) as any).ref;

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
        )(props) as NodeView<any>;

        // Mostly original TipTap code:
        // https://github.com/ueberdosis/tiptap/blob/c2e4ad9845837cd753935af1eba6a65299cbf037/packages/core/src/NodeView.ts#L104
        // This fix is to select block without inline content on mousedown
        // instead of on click. This is for the specific scenario where a user
        // is in a block and starts selecting text within a different block
        // without inline content, so that we don't run into a scenario where
        // the editor state's selection is in a different place to the DOM
        // selection. It also ensures cut/copy works as expected when text is
        // selected within a block without inline content.
        nodeView.stopEvent = (event: Event) => {
          if (!nodeView.dom) {
            return false;
          }

          if (typeof this.options.stopEvent === "function") {
            return this.options.stopEvent({ event });
          }

          const target = event.target as HTMLElement;
          const isInElement =
            nodeView.dom.contains(target) &&
            !nodeView.contentDOM?.contains(target);

          // any event from child nodes should be handled by ProseMirror
          if (!isInElement) {
            return false;
          }

          const isDragEvent = event.type.startsWith("drag");
          const isDropEvent = event.type === "drop";
          const isInput =
            ["INPUT", "BUTTON", "SELECT", "TEXTAREA"].includes(
              target.tagName
            ) || target.isContentEditable;

          // any input event within node views should be ignored by ProseMirror
          if (isInput && !isDropEvent && !isDragEvent) {
            return true;
          }

          const { isEditable } = nodeView.editor;
          const { isDragging } = nodeView;
          const isDraggable = !!nodeView.node.type.spec.draggable;
          const isSelectable = NodeSelection.isSelectable(nodeView.node);
          const isCopyEvent = event.type === "copy";
          const isPasteEvent = event.type === "paste";
          const isCutEvent = event.type === "cut";
          const isClickEvent = event.type === "mousedown";

          // ProseMirror tries to drag selectable nodes
          // even if `draggable` is set to `false`
          // this fix prevents that
          if (!isDraggable && isSelectable && isDragEvent) {
            event.preventDefault();
          }

          if (isDraggable && isDragEvent && !isDragging) {
            event.preventDefault();
            return false;
          }

          // we have to store that dragging started
          if (isDraggable && isEditable && !isDragging && isClickEvent) {
            const dragHandle = target.closest("[data-drag-handle]");
            const isValidDragHandle =
              dragHandle &&
              (nodeView.dom === dragHandle ||
                nodeView.dom.contains(dragHandle));

            if (isValidDragHandle) {
              nodeView.isDragging = true;

              document.addEventListener(
                "dragend",
                () => {
                  nodeView.isDragging = false;
                },
                { once: true }
              );

              document.addEventListener(
                "drop",
                () => {
                  nodeView.isDragging = false;
                },
                { once: true }
              );

              document.addEventListener(
                "mouseup",
                () => {
                  nodeView.isDragging = false;
                },
                { once: true }
              );
            }
          }

          // these events are handled by prosemirror
          if (
            isDragging ||
            isDropEvent ||
            isCopyEvent ||
            isPasteEvent ||
            isCutEvent ||
            (isClickEvent && isSelectable)
          ) {
            // Modified section
            // We only care about blocks without inline content for this fix, so
            // we let the editor handle the event if the block has inline
            // content.
            if (nodeView.node.type.spec.content) {
              return false;
            }

            // Selects the block on mousedown if it's not already selected. This
            // will also trigger `nodeView.selectNode` which focuses the block
            // content's DOM element (if it's focusable) - see below.
            if (isClickEvent) {
              const nodeStartPos = nodeView.getPos();
              const nodeEndPos = nodeStartPos + nodeView.node.nodeSize;
              const selectionStartPos = nodeView.editor.state.selection.from;
              const selectionEndPos = nodeView.editor.state.selection.to;

              const nodeIsSelected =
                nodeStartPos === selectionStartPos &&
                nodeEndPos === selectionEndPos;

              if (!nodeIsSelected) {
                nodeView.editor.view.dispatch(
                  nodeView.editor.state.tr.setSelection(
                    NodeSelection.create(
                      nodeView.editor.state.doc,
                      nodeStartPos
                    )
                  )
                );
              }
            }

            // While we always want to select blocks without inline content on
            // mousedown, we don't want to let the editor handle the event if
            // the block's root DOM element isn't focusable.
            const blockContent = nodeView.dom.firstElementChild!;
            const contentElement = blockContent.firstElementChild!;

            if (!contentElement.hasAttribute("tabindex")) {
              return false;
            }

            // When cutting or copying, we normally just let the editor handle
            // it and copy the whole block. However, if the user selects
            // something within the block, we want to let the browser handle it
            // and copy only the selected content.
            if (isCutEvent || isCopyEvent) {
              const windowSelection = window.getSelection();

              return windowSelection !== null && !windowSelection.isCollapsed;
            }
          }

          return true;
        };

        // Mostly original TipTap code with `as any` type casts as the
        // `ReactNodeView` class we should be using is not exported:
        // https://github.com/ueberdosis/tiptap/blob/da76972998e36a7c13c085d5cd1957f6e0ad8a90/packages/react/src/ReactNodeViewRenderer.tsx#L191
        // This fix is so that you can have a custom block which becomes focused
        // when selected. The default behaviour is that the focus remains in the
        // editor. This allows any events fired to be ignored by the editor and
        // get handled by the browsers or handlers set on the block itself. You
        // can set the custom block to use this focus override by setting
        // `tabIndex={-1}` on the component passed to `render` in its
        // implementation.
        (nodeView as any).selectNode = () => {
          (nodeView as any).renderer.updateProps({
            selected: true,
          });
          (nodeView as any).renderer.element.classList.add(
            "ProseMirror-selectednode"
          );

          // Added section
          if (nodeView.node.type.spec.content) {
            return;
          }

          const blockContent = nodeView.dom.firstElementChild!;
          const contentElement = blockContent.firstElementChild!;

          (contentElement as HTMLElement | null)?.focus();
        };

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
