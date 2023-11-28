import {
  camelToDataKebab,
  createInternalInlineContentSpec,
  createStronglyTypedTiptapNode,
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
import { FC } from "react";
import { renderToDOMSpec } from "./ReactRenderUtil";

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
  }>;
  // TODO?
  // toExternalHTML?: FC<{
  //   block: BlockFromConfig<T, I, S>;
  //   editor: BlockNoteEditor<BlockSchemaWithBlock<T["type"], T>, I, S>;
  // }>;
};

// Function that wraps the React component returned from 'blockConfig.render' in
// a `NodeViewWrapper` which also acts as a `blockContent` div. It contains the
// block type and props as HTML attributes.
export function reactWrapInInlineContentStructure<
  BType extends string,
  PSchema extends PropSchema
>(
  element: JSX.Element,
  inlineContentType: BType,
  inlineContentProps: Props<PSchema>,
  propSchema: PSchema
) {
  return () => (
    // Creates inline content section element
    <NodeViewWrapper
      as={"span"}
      // Sets inline content section class
      className={"bn-inline-content-section"}
      // Sets content type attribute
      data-inline-content-type={inlineContentType}
      // Adds props as HTML attributes in kebab-case with "data-" prefix. Skips
      // props set to their default values.
      {...Object.fromEntries(
        Object.entries(inlineContentProps)
          .filter(([prop, value]) => value !== propSchema[prop].default)
          .map(([prop, value]) => {
            return [camelToDataKebab(prop), value];
          })
      )}>
      {element}
    </NodeViewWrapper>
  );
}

// A function to create custom block for API consumers
// we want to hide the tiptap node from API consumers and provide a simpler API surface instead
export function createReactInlineContentSpec<
  T extends InlineContentConfig,
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
    selectable: inlineContentConfig.content === "styled",
    atom: inlineContentConfig.content === "none",
    content: (inlineContentConfig.content === "styled"
      ? "inline*"
      : "") as T["content"] extends "styled" ? "inline*" : "",

    addAttributes() {
      return propsToAttributes(inlineContentConfig.propSchema);
    },

    parseHTML() {
      return [
        {
          tag: `.bn-inline-content-section[data-inline-content-type="${inlineContentConfig.type}"]`,
        },
      ];
    },

    renderHTML({ node }) {
      const editor = this.options.editor;

      const ic = nodeToCustomInlineContent(
        node,
        editor.inlineContentSchema,
        editor.styleSchema
      ) as any as InlineContentFromConfig<T, S>; // TODO: fix cast
      const Content = inlineContentImplementation.render;

      return renderToDOMSpec((refCB) => {
        const FullContent = reactWrapInInlineContentStructure(
          <Content inlineContent={ic} contentRef={refCB} />,
          inlineContentConfig.type,
          node.attrs as Props<T["propSchema"]>,
          inlineContentConfig.propSchema
        );
        return <FullContent />;
      });
    },

    // TODO: needed?
    addNodeView() {
      const editor = this.options.editor;

      return (props) =>
        ReactNodeViewRenderer(
          (props: NodeViewProps) => {
            // hacky, should export `useReactNodeView` from tiptap to get access to ref
            const ref = (NodeViewContent({}) as any).ref;

            const Content = inlineContentImplementation.render;
            const FullContent = reactWrapInInlineContentStructure(
              <Content
                contentRef={ref}
                inlineContent={
                  nodeToCustomInlineContent(
                    props.node,
                    editor.inlineContentSchema,
                    editor.styleSchema
                  ) as any as InlineContentFromConfig<T, S> // TODO: fix cast
                }
              />,
              inlineContentConfig.type,
              props.node.attrs as Props<T["propSchema"]>,
              inlineContentConfig.propSchema
            );
            return <FullContent />;
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
  });
}
