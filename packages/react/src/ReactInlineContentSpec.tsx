import {
  createInternalInlineContentSpec,
  createStronglyTypedTiptapNode,
  CustomInlineContentConfig,
  InlineContentConfig,
  InlineContentFromConfig,
  nodeToCustomInlineContent,
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
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

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
    content: (inlineContentConfig.content === "styled"
      ? "inline*"
      : "") as T["content"] extends "styled" ? "inline*" : "",

    addAttributes() {
      return propsToAttributes(inlineContentConfig.propSchema);
    },

    // parseHTML() {
    //   return parse(blockConfig);
    // },

    renderHTML({ node }) {
      const editor = this.options.editor;

      const ic = nodeToCustomInlineContent(
        node,
        editor.inlineContentSchema,
        editor.styleSchema
      ) as any as InlineContentFromConfig<T, S>; // TODO: fix cast

      const Content = inlineContentImplementation.render;

      let contentDOM: HTMLElement | undefined;
      const div = document.createElement("div");
      const root = createRoot(div);
      flushSync(() => {
        root.render(
          <Content
            inlineContent={ic}
            contentRef={(el) => (contentDOM = el || undefined)}
          />
        );
      });

      if (!div.childElementCount) {
        // TODO
        console.warn("ReactInlineContentSpec: renderHTML() failed");
        return {
          dom: document.createElement("span"),
        };
      }

      // clone so we can unmount the react root
      contentDOM?.setAttribute("data-tmp-find", "true");
      const cloneRoot = div.cloneNode(true) as HTMLElement;
      const dom = cloneRoot.firstElementChild! as HTMLElement;
      const contentDOMClone = cloneRoot.querySelector(
        "[data-tmp-find]"
      ) as HTMLElement | null;
      contentDOMClone?.removeAttribute("data-tmp-find");

      root.unmount();

      return {
        dom,
        contentDOM: contentDOMClone || undefined,
      };
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
            return (
              <NodeViewWrapper as="span">
                <Content
                  contentRef={ref}
                  inlineContent={
                    nodeToCustomInlineContent(
                      props.node,
                      editor.inlineContentSchema,
                      editor.styleSchema
                    ) as any as InlineContentFromConfig<T, S> // TODO: fix cast
                  }
                />
              </NodeViewWrapper>
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
