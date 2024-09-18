import { NodeViewRendererProps } from "@tiptap/core";
import { TagParseRule } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import { NodeView } from "@tiptap/pm/view";

import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { InlineContentSchema } from "../inlineContent/types";
import { StyleSchema } from "../styles/types";
import {
  createInternalBlockSpec,
  createStronglyTypedTiptapNode,
  getBlockFromPos,
  propsToAttributes,
  wrapInBlockStructure,
} from "./internal";
import {
  BlockConfig,
  BlockFromConfig,
  BlockSchemaWithBlock,
  PartialBlockFromConfig,
} from "./types";

// restrict content to "inline" and "none" only
export type CustomBlockConfig = BlockConfig & {
  content: "inline" | "none";
};

export type CustomBlockImplementation<
  T extends CustomBlockConfig,
  I extends InlineContentSchema,
  S extends StyleSchema
> = {
  render: (
    /**
     * The custom block to render
     */
    block: BlockFromConfig<T, I, S>,
    /**
     * The BlockNote editor instance
     * This is typed generically. If you want an editor with your custom schema, you need to
     * cast it manually, e.g.: `const e = editor as BlockNoteEditor<typeof mySchema>;`
     */
    editor: BlockNoteEditor<BlockSchemaWithBlock<T["type"], T>, I, S>
    // (note) if we want to fix the manual cast, we need to prevent circular references and separate block definition and render implementations
    // or allow manually passing <BSchema>, but that's not possible without passing the other generics because Typescript doesn't support partial inferred generics
  ) => {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
    destroy?: () => void;
  };
  // Exports block to external HTML. If not defined, the output will be the same
  // as `render(...).dom`. Used to create clipboard data when pasting outside
  // BlockNote.
  // TODO: Maybe can return undefined to ignore when serializing?
  toExternalHTML?: (
    block: BlockFromConfig<T, I, S>,
    editor: BlockNoteEditor<BlockSchemaWithBlock<T["type"], T>, I, S>
  ) => {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
  };

  parse?: (
    el: HTMLElement
  ) => PartialBlockFromConfig<T, I, S>["props"] | undefined;
};

export function fixNodeViewTextSelection(
  props: NodeViewRendererProps,
  nodeView: NodeView
) {
  // Necessary for DOM to handle selections.
  nodeView.ignoreMutation = () => true;

  // Prevents selecting the node from making it draggable, and prevents the DOM selection from being visible when it wraps the node.
  nodeView.selectNode = () => {
    (nodeView.dom as HTMLElement).classList.add("ProseMirror-selectednode");
    props.editor.view.dom.classList.add("ProseMirror-fullyselected");
  };

  nodeView.stopEvent = (event) => {
    // Let the browser handle copy events, as these only fire when the whole
    // node isn't selected.
    if (event.type === "cut" || event.type === "copy") {
      return true;
    }

    // Prevent all drag events.
    if (event.type.startsWith("drag")) {
      event.preventDefault();
      return true;
    }

    // Keyboard events should be handled by the browser. This doesn't prevent
    // BlockNote's own key handlers from firing.
    if (event.type.startsWith("key")) {
      return true;
    }

    // Select the node on mouse down, if it isn't already selected.
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
        nodeStartPos === selectionStartPos && nodeEndPos === selectionEndPos;

      if (!nodeIsSelected) {
        // Select node in editor state if not already selected.
        props.editor.view.dispatch(
          props.editor.view.state.tr.setSelection(
            NodeSelection.create(props.editor.view.state.doc, nodeStartPos)
          )
        );
      }

      return true;
    }

    return false;
  };
}

// Function that uses the 'parse' function of a blockConfig to create a
// TipTap node's `parseHTML` property. This is only used for parsing content
// from the clipboard.
export function getParseRules(
  config: BlockConfig,
  customParseFunction: CustomBlockImplementation<any, any, any>["parse"]
) {
  const rules: TagParseRule[] = [
    {
      tag: "[data-content-type=" + config.type + "]",
      contentElement: "[data-editable]",
    },
  ];

  if (customParseFunction) {
    rules.push({
      tag: "*",
      getAttrs(node: string | HTMLElement) {
        if (typeof node === "string") {
          return false;
        }

        const props = customParseFunction?.(node);

        if (props === undefined) {
          return false;
        }

        return props;
      },
    });
  }
  //     getContent(node, schema) {
  //       const block = blockConfig.parse?.(node as HTMLElement);
  //
  //       if (block !== undefined && block.content !== undefined) {
  //         return Fragment.from(
  //           typeof block.content === "string"
  //             ? schema.text(block.content)
  //             : inlineContentToNodes(block.content, schema)
  //         );
  //       }
  //
  //       return Fragment.empty;
  //     },
  //   });
  // }

  return rules;
}

// A function to create custom block for API consumers
// we want to hide the tiptap node from API consumers and provide a simpler API surface instead
export function createBlockSpec<
  T extends CustomBlockConfig,
  I extends InlineContentSchema,
  S extends StyleSchema
>(blockConfig: T, blockImplementation: CustomBlockImplementation<T, I, S>) {
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
        // Gets the BlockNote editor instance
        const editor = this.options.editor;
        // Gets the block
        const block = getBlockFromPos(
          props.getPos,
          editor,
          this.editor,
          blockConfig.type
        );
        // Gets the custom HTML attributes for `blockContent` nodes
        const blockContentDOMAttributes =
          this.options.domAttributes?.blockContent || {};

        const output = blockImplementation.render(block as any, editor);

        const nodeView: NodeView = wrapInBlockStructure(
          output,
          block.type,
          block.props,
          blockConfig.propSchema,
          blockContentDOMAttributes
        );

        if (
          blockConfig.content === "none" &&
          blockConfig.canSelectText === true
        ) {
          fixNodeViewTextSelection(props, nodeView);
        }

        return nodeView;
      };
    },
  });

  if (node.name !== blockConfig.type) {
    throw new Error(
      "Node name does not match block type. This is a bug in BlockNote."
    );
  }

  return createInternalBlockSpec(blockConfig, {
    node,
    toInternalHTML: (block, editor) => {
      const blockContentDOMAttributes =
        node.options.domAttributes?.blockContent || {};

      const output = blockImplementation.render(block as any, editor as any);

      return wrapInBlockStructure(
        output,
        block.type,
        block.props,
        blockConfig.propSchema,
        blockConfig.isFileBlock,
        blockContentDOMAttributes
      );
    },
    toExternalHTML: (block, editor) => {
      const blockContentDOMAttributes =
        node.options.domAttributes?.blockContent || {};

      let output = blockImplementation.toExternalHTML?.(
        block as any,
        editor as any
      );
      if (output === undefined) {
        output = blockImplementation.render(block as any, editor as any);
      }

      return wrapInBlockStructure(
        output,
        block.type,
        block.props,
        blockConfig.propSchema,
        blockContentDOMAttributes
      );
    },
  });
}
