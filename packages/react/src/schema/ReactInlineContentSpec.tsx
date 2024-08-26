import {
  addInlineContentAttributes,
  addInlineContentKeyboardShortcuts,
  camelToDataKebab,
  createInternalInlineContentSpec,
  createStronglyTypedTiptapNode,
  CustomInlineContentConfig,
  getInlineContentParseRules,
  InlineContentConfig,
  InlineContentFromConfig,
  nodeToCustomInlineContent,
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
// import { useReactNodeView } from "@tiptap/react/dist/packages/react/src/useReactNodeView";
import { Node } from "@tiptap/pm/model";
import { FC } from "react";
import { renderToDOMSpec } from "./@util/ReactRenderUtil";

// this file is mostly analogoues to `customBlocks.ts`, but for React blocks

// extend BlockConfig but use a React render function
export type ReactInlineContentImplementation<
  T extends InlineContentConfig,
  // I extends InlineContentSchema,
  S extends StyleSchema
> = {
  render: FC<{
    inlineContent: InlineContentFromConfig<T, S>;
    contentRef: (node: HTMLElement | null) => void;
    node: Node;
    isSelected: boolean;
  }>;
  // TODO?
  // toExternalHTML?: FC<{
  //   block: BlockFromConfig<T, I, S>;
  //   editor: BlockNoteEditor<BlockSchemaWithBlock<T["type"], T>, I, S>;
  // }>;
};

// Function that adds a wrapper with necessary classes and attributes to the
// component returned from a custom inline content's 'render' function, to
// ensure no data is lost on internal copy & paste.
export function InlineContentWrapper<
  IType extends string,
  PSchema extends PropSchema
>(props: {
  children: JSX.Element;
  inlineContentType: IType;
  inlineContentProps: Props<PSchema>;
  propSchema: PSchema;
}) {
  return (
    // Creates inline content section element
    <NodeViewWrapper
      as={"span"}
      // Sets inline content section class
      className={"bn-inline-content-section"}
      // Sets content type attribute
      data-inline-content-type={props.inlineContentType}
      // Adds props as HTML attributes in kebab-case with "data-" prefix. Skips
      // props set to their default values.
      {...Object.fromEntries(
        Object.entries(props.inlineContentProps)
          .filter(([prop, value]) => value !== props.propSchema[prop].default)
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
export function createReactInlineContentSpec<
  T extends CustomInlineContentConfig,
  // I extends InlineContentSchema,
  S extends StyleSchema
>(
  inlineContentConfig: T,
  inlineContentImplementation: ReactInlineContentImplementation<T, S>
) {
  const node = createStronglyTypedTiptapNode({
    name: inlineContentConfig.type as T["type"],
    inline: true,
    group: "inline",
    selectable: true, //inlineContentConfig.content === "styled",
    atom: inlineContentConfig.content === "none",
    content: (inlineContentConfig.content === "styled"
      ? "inline*"
      : "") as T["content"] extends "styled" ? "inline*" : "",

    addAttributes() {
      return propsToAttributes(inlineContentConfig.propSchema);
    },

    addKeyboardShortcuts() {
      return addInlineContentKeyboardShortcuts(inlineContentConfig);
    },

    parseHTML() {
      return getInlineContentParseRules(inlineContentConfig);
    },

    renderHTML({ node, ...args }) {
      if (inlineContentConfig.renderHTML) {
        return inlineContentConfig.renderHTML({ node, ...args });
      }
      const editor = this.options.editor;

      const ic = nodeToCustomInlineContent(
        node,
        editor.schema.inlineContentSchema,
        editor.schema.styleSchema
      ) as any as InlineContentFromConfig<T, S>; // TODO: fix cast
      const Content = inlineContentImplementation.render;
      const output = renderToDOMSpec(
        (refCB) => (
          <Content
            inlineContent={ic}
            contentRef={refCB}
            node={node}
            isSelected={false}
          />
        ),
        editor
      );

      return addInlineContentAttributes(
        output,
        inlineContentConfig.type,
        node.attrs as Props<T["propSchema"]>,
        inlineContentConfig.propSchema
      );
    },

    addNodeView() {
      const editor = this.options.editor;
      return (props) =>
        ReactNodeViewRenderer(
          (props: NodeViewProps) => {
            // hacky, should export `useReactNodeView` from tiptap to get access to ref
            const ref = (NodeViewContent({}) as any).ref;

            const Content = inlineContentImplementation.render;

            const isSelected =
              props.selected &&
              props.editor.state.selection.from === props.getPos() &&
              props.editor.state.selection.to ===
                props.getPos() + props.node.nodeSize;

            return (
              <InlineContentWrapper
                inlineContentProps={props.node.attrs as Props<T["propSchema"]>}
                inlineContentType={inlineContentConfig.type}
                propSchema={inlineContentConfig.propSchema}>
                <Content
                  contentRef={ref}
                  node={props.node}
                  inlineContent={
                    nodeToCustomInlineContent(
                      props.node,
                      editor.schema.inlineContentSchema,
                      editor.schema.styleSchema
                    ) as any as InlineContentFromConfig<T, S> // TODO: fix cast
                  }
                  isSelected={isSelected}
                />
              </InlineContentWrapper>
            );
          },
          {
            className: "bn-ic-react-node-view-renderer",
            as: "span",
            // contentDOMElementTag: "span", (requires tt upgrade)
          }
        )(props);
    },
  });

  return createInternalInlineContentSpec(inlineContentConfig, {
    node: node,
  } as any);
}
