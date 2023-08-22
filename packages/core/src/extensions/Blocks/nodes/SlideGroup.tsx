import {
  Editor,
  mergeAttributes,
  Node,
  NodeConfig,
  ParentConfig,
} from "@tiptap/core";
import styles from "./Block.module.css";
import { BlockNoteDOMAttributes } from "../api/blockTypes";
import { mergeCSSClasses } from "../../../shared/utils";
import {
  NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  NodeViewContent,
} from "@tiptap/react";
import { FC } from "react";
import { createContext } from "react";
import { NodeType } from "prosemirror-model";
import SlideWrapper from "../../../../../../examples/editor/src/Slide/SlideWrapper";

export const SlideGroup = Node.create<{
  domAttributes?: BlockNoteDOMAttributes;
}>({
  name: "slideGroup",
  content: "slide+",

  parseHTML() {
    return [
      {
        tag: "div",
        getAttrs: (element) => {
          if (typeof element === "string") {
            return false;
          }

          if (element.getAttribute("data-node-type") === "slideGroup") {
            // Null means the element matches, but we don't want to add any attributes to the node.
            return null;
          }

          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const blockGroupDOMAttributes =
      this.options.domAttributes?.blockGroup || {};

    return [
      "div",
      mergeAttributes(
        {
          ...blockGroupDOMAttributes,
          class: mergeCSSClasses(
            styles.blockGroup,
            blockGroupDOMAttributes.class
          ),
          "data-node-type": "slideGroup",
        },
        HTMLAttributes
      ),
      0,
    ];
  },
});

const BlockNoteDOMAttributesContext = createContext<BlockNoteDOMAttributes>({});

export const Slide = Node.create<{
  domAttributes?: BlockNoteDOMAttributes;
}>({
  name: "slide",
  content: "blockContent+",

  parseHTML() {
    return [
      {
        tag: "div",
        getAttrs: (element) => {
          if (typeof element === "string") {
            return false;
          }

          if (element.getAttribute("data-node-type") === "slide") {
            // Null means the element matches, but we don't want to add any attributes to the node.
            return null;
          }

          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const blockGroupDOMAttributes =
      this.options.domAttributes?.blockGroup || {};

    return [
      "div",
      mergeAttributes(
        {
          ...blockGroupDOMAttributes,
          class: mergeCSSClasses(
            styles.blockGroup,
            blockGroupDOMAttributes.class
          ),
          "data-node-type": "slide",
        },
        HTMLAttributes
      ),
      0,
    ];
  },

  addNodeView(this: {
    name: string;
    options: any;
    storage: any;
    editor: Editor;
    type: NodeType;
    parent: ParentConfig<NodeConfig<any, any>>["addNodeView"];
  }) {
    const BlockContent: FC<NodeViewProps> = (props: NodeViewProps) => {
      // const Content  = op
      return (
        <NodeViewWrapper>
          <BlockNoteDOMAttributesContext.Provider
            value={this.options.domAttributes || {}}>
            <SlideWrapper>
              <NodeViewContent />
            </SlideWrapper>
          </BlockNoteDOMAttributesContext.Provider>
        </NodeViewWrapper>
      );
    };
    return ReactNodeViewRenderer(BlockContent, {
      className: "",
    });
  },
});
