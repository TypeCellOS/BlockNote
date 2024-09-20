import {
  BlockFromConfig,
  BlockNoteEditor,
  BlockSchemaWithBlock,
  CustomBlockConfig,
  InlineContentSchema,
  PartialBlockFromConfig,
  PropSchema,
  Props,
  StyleSchema,
  camelToDataKebab,
  createInternalBlockSpec,
  createStronglyTypedTiptapNode,
  getBlockFromPos,
  getBlockInfoFromPos,
  getParseRules,
  inheritedProps,
  mergeCSSClasses,
  propsToAttributes,
} from "@blocknote/core";
import { NodeSelection } from "@tiptap/pm/state";
import {
  NodeViewContent,
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
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
        const nv = ReactNodeViewRenderer(
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
        )(props);
        // nv.ignoreMutation = () => true;
        nv.stopEvent = (event) => {
          console.log("event", event);
          if (event.type === "copy") {
            const selection = document.getSelection();
            if (selection === null) {
              return false;
            }

            const blockInfo = getBlockInfoFromPos(
              props.editor.state.doc,
              props.editor.state.selection.from
            );

            const blockElement = props.editor.view.domAtPos(
              blockInfo.startPos
            ).node;

            if (selection.type === "None" || selection.type === "Caret") {
              // let prosemirror handle the event when there's no text selected
              // TODO: except if we're in an input / textarea / contenteditable, then return true
              return false;
            }

            // only let prosemirror handle the event if the entire node is selected
            return (
              selection.type !== "Range" ||
              selection.anchorNode !== blockElement ||
              selection.focusNode !== blockElement ||
              selection.anchorOffset !== 0 ||
              selection.focusOffset !== 1
            );
          }
          if (event.type.startsWith("key")) {
            // TODO: copy logic from tiptap related to inputs etc
            return true;
          }
          if (event.type === "mousedown") {
            if (typeof props.getPos !== "function") {
              return false;
            }

            const nodeStartPos = props.getPos();
            const nodeEndPos = nodeStartPos + props.node.nodeSize;
            const selectionStartPos = props.editor.view.state.selection.from;
            const selectionEndPos = props.editor.view.state.selection.to;

            // Node is selected in the editor state.
            const nodeIsSelected =
              nodeStartPos === selectionStartPos &&
              nodeEndPos === selectionEndPos;

            if (!nodeIsSelected) {
              // Select node in editor state if not already selected.
              props.editor.view.dom.blur(); // blur so that prosemirror doesn't set dom selection
              props.editor.view.dispatch(
                props.editor.view.state.tr.setSelection(
                  NodeSelection.create(
                    props.editor.view.state.doc,
                    nodeStartPos
                  )
                )
              );
              setTimeout(() => {
                props.editor.view.dom.blur();
              }, 10);
            }
            return true;
          }
          return false;
        };
        return nv;
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
