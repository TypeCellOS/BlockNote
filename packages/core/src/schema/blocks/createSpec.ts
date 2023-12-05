import { ParseRule } from "@tiptap/pm/model";
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

// Function that uses the 'parse' function of a blockConfig to create a
// TipTap node's `parseHTML` property. This is only used for parsing content
// from the clipboard.
export function getParseRules(
  config: BlockConfig,
  customParseFunction: CustomBlockImplementation<any, any, any>["parse"]
) {
  const rules: ParseRule[] = [
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
      return ({ getPos }) => {
        // Gets the BlockNote editor instance
        const editor = this.options.editor;
        // Gets the block
        const block = getBlockFromPos(
          getPos,
          editor,
          this.editor,
          blockConfig.type
        );
        // Gets the custom HTML attributes for `blockContent` nodes
        const blockContentDOMAttributes =
          this.options.domAttributes?.blockContent || {};

        const output = blockImplementation.render(block as any, editor);

        return wrapInBlockStructure(
          output,
          block.type,
          block.props,
          blockConfig.propSchema,
          blockContentDOMAttributes
        );
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
