import { Editor } from "@tiptap/core";
import { DOMParser, Fragment, TagParseRule } from "@tiptap/pm/model";
import { NodeView } from "@tiptap/pm/view";
import { mergeParagraphs } from "../../blocks/defaultBlockHelpers.js";
import {
  createTypedBlockSpec,
  createStronglyTypedTiptapNode,
  getBlockFromPos,
  propsToAttributes,
  wrapInBlockStructure,
} from "./internal.js";
import { BlockConfig, BlockImplementation, BlockSpec } from "./types.js";
import { BlockNoteExtension } from "../../editor/BlockNoteExtension.js";
import { PropSchema } from "../propTypes.js";

// Function that causes events within non-selectable blocks to be handled by the
// browser instead of the editor.
export function applyNonSelectableBlockFix(nodeView: NodeView, editor: Editor) {
  nodeView.stopEvent = (event) => {
    // Blurs the editor on mouse down as the block is non-selectable. This is
    // mainly done to prevent UI elements like the formatting toolbar from being
    // visible while content within a non-selectable block is selected.
    if (event.type === "mousedown") {
      setTimeout(() => {
        editor.view.dom.blur();
      }, 10);
    }

    return true;
  };
}

// Function that uses the 'parse' function of a blockConfig to create a
// TipTap node's `parseHTML` property. This is only used for parsing content
// from the clipboard.
export function getParseRules<
  TName extends string,
  TProps extends PropSchema,
  TContent extends "inline" | "none" | "table",
>(
  config: BlockConfig<TName, TProps, TContent>,
  customParseFunction: BlockImplementation<TName, TProps, TContent>["parse"],
  customParseContentFunction: BlockImplementation<
    TName,
    TProps,
    TContent
  >["parseContent"],
) {
  const rules: TagParseRule[] = [
    {
      tag: "[data-content-type=" + config.type + "]",
      contentElement: ".bn-inline-content",
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
      getContent:
        config.content === "inline" || config.content === "none"
          ? (node, schema) => {
              if (customParseContentFunction) {
                return customParseContentFunction({
                  el: node as HTMLElement,
                  schema,
                });
              }

              if (config.content === "inline") {
                // Parse the blockquote content as inline content
                const element = node as HTMLElement;

                // Clone to avoid modifying the original
                const clone = element.cloneNode(true) as HTMLElement;

                // Merge multiple paragraphs into one with line breaks
                mergeParagraphs(clone, config.meta?.code ? "\n" : "<br>");

                // Parse the content directly as a paragraph to extract inline content
                const parser = DOMParser.fromSchema(schema);
                const parsed = parser.parse(clone, {
                  topNode: schema.nodes.paragraph.create(),
                });

                return parsed.content;
              }
              return Fragment.empty;
            }
          : undefined,
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
export function addNodeAndExtensionsToSpec<
  TName extends string,
  TProps extends PropSchema,
  TContent extends "inline" | "none" | "table",
>(
  blockConfig: BlockConfig<TName, TProps, TContent>,
  blockImplementation: BlockImplementation<TName, TProps, TContent>,
  priority?: number,
) {
  const node = createStronglyTypedTiptapNode({
    name: blockConfig.type,
    content: (blockConfig.content === "inline"
      ? "inline*"
      : blockConfig.content === "none"
        ? ""
        : blockConfig.content) as TContent extends "inline" ? "inline*" : "",
    group: "blockContent",
    selectable: blockConfig.meta?.selectable ?? true,
    isolating: true,
    code: blockConfig.meta?.code ?? false,
    defining: blockConfig.meta?.defining ?? true,
    priority,
    addAttributes() {
      return propsToAttributes(blockConfig.propSchema);
    },

    parseHTML() {
      return getParseRules(
        blockConfig,
        blockImplementation.parse,
        (blockImplementation as any).parseContent,
      );
    },

    renderHTML({ HTMLAttributes }) {
      // renderHTML is used for copy/pasting content from the editor back into
      // the editor, so we need to make sure the `blockContent` element is
      // structured correctly as this is what's used for parsing blocks. We
      // just render a placeholder div inside as the `blockContent` element
      // already has all the information needed for proper parsing.
      const div = document.createElement("div");
      return wrapInBlockStructure(
        {
          dom: div,
          contentDOM: blockConfig.content === "inline" ? div : undefined,
        },
        blockConfig.type,
        {},
        blockConfig.propSchema,
        blockConfig.meta?.fileBlockAccept !== undefined,
        HTMLAttributes,
      );
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
          blockConfig.type,
        );
        // Gets the custom HTML attributes for `blockContent` nodes
        const blockContentDOMAttributes =
          this.options.domAttributes?.blockContent || {};

        const output = blockImplementation.render(block as any, editor);

        const nodeView = wrapInBlockStructure(
          output,
          block.type,
          block.props,
          blockConfig.propSchema,
          blockConfig.meta?.fileBlockAccept !== undefined,
          blockContentDOMAttributes,
        ) satisfies NodeView;

        if (blockConfig.meta?.selectable === false) {
          applyNonSelectableBlockFix(nodeView, this.editor);
        }

        return nodeView;
      };
    },
  });

  if (node.name !== blockConfig.type) {
    throw new Error(
      "Node name does not match block type. This is a bug in BlockNote.",
    );
  }

  return createTypedBlockSpec(blockConfig, {
    node,
    render: (block, editor) => {
      const blockContentDOMAttributes =
        node.options.domAttributes?.blockContent || {};

      const output = blockImplementation.render(block as any, editor as any);

      return wrapInBlockStructure(
        output,
        block.type,
        block.props,
        blockConfig.propSchema,
        blockConfig.meta?.fileBlockAccept !== undefined,
        blockContentDOMAttributes,
      );
    },
    // TODO: this should not have wrapInBlockStructure and generally be a lot simpler
    // post-processing in externalHTMLExporter should not be necessary
    toExternalHTML: (block, editor) => {
      const blockContentDOMAttributes =
        node.options.domAttributes?.blockContent || {};

      let output:
        | {
            dom: HTMLElement | DocumentFragment;
            contentDOM?: HTMLElement;
          }
        | undefined = blockImplementation.toExternalHTML?.(
        block as any,
        editor as any,
      );
      if (output === undefined) {
        output = blockImplementation.render(block as any, editor as any);
      }
      return wrapInBlockStructure(
        output,
        block.type,
        block.props,
        blockConfig.propSchema,
        blockContentDOMAttributes,
      );
    },
    // Only needed for tables right now, remove later
    requiredExtensions: (blockImplementation as any).requiredExtensions,
  });
}

/**
 * Helper function to create a block config.
 */
export function createBlockConfig<
  TCallback extends (
    options: Partial<Record<string, any>>,
  ) => BlockConfig<any, any, any>,
  TOptions extends Parameters<TCallback>[0],
  TName extends ReturnType<TCallback>["type"],
  TProps extends ReturnType<TCallback>["propSchema"],
  TContent extends ReturnType<TCallback>["content"],
>(
  callback: TCallback,
): (options: TOptions) => BlockConfig<TName, TProps, TContent> {
  return callback;
}

/**
 * Helper function to create a block definition.
 */
export function createBlockSpec<
  TCallback extends (options?: any) => BlockConfig<any, any, any>,
  TOptions extends Parameters<TCallback>[0],
  TName extends ReturnType<TCallback>["type"],
  TProps extends ReturnType<TCallback>["propSchema"],
  TContent extends ReturnType<TCallback>["content"],
>(
  createBlockConfig: TCallback,
): {
  implementation: (
    createBlockImplementation: (
      options?: TOptions,
    ) => BlockImplementation<TName, TProps, TContent>,
    addExtensions?: (options?: TOptions) => BlockNoteExtension<any>[],
  ) => (options?: TOptions) => BlockSpec<TName, TProps, TContent>;
} {
  return {
    implementation: (createBlockImplementation, addExtensions) => (options) => {
      const blockConfig = createBlockConfig(options);
      const blockImplementation = createBlockImplementation(options);
      const extensions = addExtensions?.(options);

      return {
        config: blockConfig,
        implementation: blockImplementation,
        extensions: extensions,
      };
    },
  };
}
/**
 * This creates an instance of a BlockNoteExtension that can be used to add to a schema.
 * It is a bit of a hack, but it works.
 */
export function createBlockNoteExtension(
  options: Partial<
    Pick<BlockNoteExtension, "inputRules" | "keyboardShortcuts" | "plugins">
  > & { key: string },
) {
  const x = Object.create(BlockNoteExtension.prototype);
  x.key = options.key;
  x.inputRules = options.inputRules;
  x.keyboardShortcuts = options.keyboardShortcuts;
  x.plugins = options.plugins ?? [];
  return x as BlockNoteExtension;
}
