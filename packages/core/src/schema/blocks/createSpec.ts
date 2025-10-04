import { Editor, Node } from "@tiptap/core";
import { DOMParser, Fragment, TagParseRule } from "@tiptap/pm/model";
import { NodeView } from "@tiptap/pm/view";
import { mergeParagraphs } from "../../blocks/defaultBlockHelpers.js";
import { BlockNoteExtension } from "../../editor/BlockNoteExtension.js";
import { PropSchema } from "../propTypes.js";
import {
  getBlockFromPos,
  propsToAttributes,
  wrapInBlockStructure,
} from "./internal.js";
import {
  BlockConfig,
  BlockImplementation,
  BlockSpec,
  LooseBlockSpec,
} from "./types.js";

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
  implementation: BlockImplementation<TName, TProps, TContent>,
) {
  const rules: TagParseRule[] = [
    {
      tag: "[data-content-type=" + config.type + "]",
      contentElement: ".bn-inline-content",
    },
  ];

  if (implementation.parse) {
    rules.push({
      tag: "*",
      getAttrs(node: string | HTMLElement) {
        if (typeof node === "string") {
          return false;
        }

        const props = implementation.parse?.(node);

        if (props === undefined) {
          return false;
        }

        return props;
      },
      getContent:
        config.content === "inline" || config.content === "none"
          ? (node, schema) => {
              if (implementation.parseContent) {
                return implementation.parseContent({
                  el: node as HTMLElement,
                  schema,
                });
              }

              if (config.content === "inline") {
                // Parse the inline content if it exists
                const element = node as HTMLElement;

                // Clone to avoid modifying the original
                const clone = element.cloneNode(true) as HTMLElement;

                // Merge multiple paragraphs into one with line breaks
                mergeParagraphs(
                  clone,
                  implementation.meta?.code ? "\n" : "<br>",
                );

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
  extensions?: BlockNoteExtension<any>[],
  priority?: number,
): LooseBlockSpec<TName, TProps, TContent> {
  const node =
    ((blockImplementation as any).node as Node) ||
    Node.create({
      name: blockConfig.type,
      content: (blockConfig.content === "inline"
        ? "inline*"
        : blockConfig.content === "none"
          ? ""
          : blockConfig.content) as TContent extends "inline" ? "inline*" : "",
      group: "blockContent",
      selectable: blockImplementation.meta?.selectable ?? true,
      isolating: blockImplementation.meta?.isolating ?? true,
      code: blockImplementation.meta?.code ?? false,
      defining: blockImplementation.meta?.defining ?? true,
      priority,
      addAttributes() {
        return propsToAttributes(blockConfig.propSchema);
      },

      parseHTML() {
        return getParseRules(blockConfig, blockImplementation);
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
          blockImplementation.meta?.fileBlockAccept !== undefined,
          HTMLAttributes,
        );
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
            blockConfig.type,
          );
          // Gets the custom HTML attributes for `blockContent` nodes
          const blockContentDOMAttributes =
            this.options.domAttributes?.blockContent || {};

          const nodeView = blockImplementation.render.call(
            { blockContentDOMAttributes, props, renderType: "nodeView" },
            block as any,
            editor as any,
          );

          if (blockImplementation.meta?.selectable === false) {
            applyNonSelectableBlockFix(nodeView, this.editor);
          }

          // See explanation for why `update` is not implemented for NodeViews
          // https://github.com/TypeCellOS/BlockNote/pull/1904#discussion_r2313461464
          return nodeView;
        };
      },
    });

  if (node.name !== blockConfig.type) {
    throw new Error(
      "Node name does not match block type. This is a bug in BlockNote.",
    );
  }

  return {
    config: blockConfig,
    implementation: {
      ...blockImplementation,
      node,
      render(block, editor) {
        const blockContentDOMAttributes =
          node.options.domAttributes?.blockContent || {};

        return blockImplementation.render.call(
          {
            blockContentDOMAttributes,
            props: undefined,
            renderType: "dom",
          },
          block as any,
          editor as any,
        );
      },
      // TODO: this should not have wrapInBlockStructure and generally be a lot simpler
      // post-processing in externalHTMLExporter should not be necessary
      toExternalHTML: (block, editor) => {
        const blockContentDOMAttributes =
          node.options.domAttributes?.blockContent || {};

        return (
          blockImplementation.toExternalHTML?.call(
            { blockContentDOMAttributes },
            block as any,
            editor as any,
          ) ??
          blockImplementation.render.call(
            { blockContentDOMAttributes, renderType: "dom", props: undefined },
            block as any,
            editor as any,
          )
        );
      },
    },
    extensions,
  };
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
): TOptions extends undefined
  ? () => BlockConfig<TName, TProps, TContent>
  : (options: TOptions) => BlockConfig<TName, TProps, TContent> {
  return callback as any;
}

/**
 * Helper function to create a block definition.
 * Can accept either functions that return the required objects, or the objects directly.
 */
export function createBlockSpec<
  const TName extends string,
  const TProps extends PropSchema,
  const TContent extends "inline" | "none",
  const TOptions extends Partial<Record<string, any>> | undefined = undefined,
>(
  blockConfigOrCreator: BlockConfig<TName, TProps, TContent>,
  blockImplementationOrCreator:
    | BlockImplementation<TName, TProps, TContent>
    | (TOptions extends undefined
        ? () => BlockImplementation<TName, TProps, TContent>
        : (
            options: Partial<TOptions>,
          ) => BlockImplementation<TName, TProps, TContent>),
  extensionsOrCreator?:
    | BlockNoteExtension<any>[]
    | (TOptions extends undefined
        ? () => BlockNoteExtension<any>[]
        : (options: Partial<TOptions>) => BlockNoteExtension<any>[]),
): (options?: Partial<TOptions>) => BlockSpec<TName, TProps, TContent>;
export function createBlockSpec<
  const TName extends string,
  const TProps extends PropSchema,
  const TContent extends "inline" | "none",
  const BlockConf extends BlockConfig<TName, TProps, TContent>,
  const TOptions extends Partial<Record<string, any>>,
>(
  blockCreator: (options: Partial<TOptions>) => BlockConf,
  blockImplementationOrCreator:
    | BlockImplementation<
        BlockConf["type"],
        BlockConf["propSchema"],
        BlockConf["content"]
      >
    | (TOptions extends undefined
        ? () => BlockImplementation<
            BlockConf["type"],
            BlockConf["propSchema"],
            BlockConf["content"]
          >
        : (
            options: Partial<TOptions>,
          ) => BlockImplementation<
            BlockConf["type"],
            BlockConf["propSchema"],
            BlockConf["content"]
          >),
  extensionsOrCreator?:
    | BlockNoteExtension<any>[]
    | (TOptions extends undefined
        ? () => BlockNoteExtension<any>[]
        : (options: Partial<TOptions>) => BlockNoteExtension<any>[]),
): (
  options?: Partial<TOptions>,
) => BlockSpec<
  BlockConf["type"],
  BlockConf["propSchema"],
  BlockConf["content"]
>;
export function createBlockSpec<
  const TName extends string,
  const TProps extends PropSchema,
  const TContent extends "inline" | "none",
  const TOptions extends Partial<Record<string, any>> | undefined = undefined,
>(
  blockConfigOrCreator:
    | BlockConfig<TName, TProps, TContent>
    | (TOptions extends undefined
        ? () => BlockConfig<TName, TProps, TContent>
        : (options: Partial<TOptions>) => BlockConfig<TName, TProps, TContent>),
  blockImplementationOrCreator:
    | BlockImplementation<TName, TProps, TContent>
    | (TOptions extends undefined
        ? () => BlockImplementation<TName, TProps, TContent>
        : (
            options: Partial<TOptions>,
          ) => BlockImplementation<TName, TProps, TContent>),
  extensionsOrCreator?:
    | BlockNoteExtension<any>[]
    | (TOptions extends undefined
        ? () => BlockNoteExtension<any>[]
        : (options: Partial<TOptions>) => BlockNoteExtension<any>[]),
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

    const extensions = extensionsOrCreator
      ? typeof extensionsOrCreator === "function"
        ? extensionsOrCreator(options as any)
        : extensionsOrCreator
      : undefined;

    return {
      config: blockConfig,
      implementation: {
        ...blockImplementation,
        // TODO: this should not have wrapInBlockStructure and generally be a lot simpler
        // post-processing in externalHTMLExporter should not be necessary
        toExternalHTML(block, editor) {
          const output = blockImplementation.toExternalHTML?.call(
            { blockContentDOMAttributes: this.blockContentDOMAttributes },
            block as any,
            editor as any,
          );

          if (output === undefined) {
            return undefined;
          }

          return wrapInBlockStructure(
            output,
            block.type,
            block.props,
            blockConfig.propSchema,
            blockImplementation.meta?.fileBlockAccept !== undefined,
          );
        },
        render(block, editor) {
          const output = blockImplementation.render.call(
            {
              blockContentDOMAttributes: this.blockContentDOMAttributes,
              renderType: this.renderType,
              props: this.props as any,
            },
            block as any,
            editor as any,
          );

          const nodeView = wrapInBlockStructure(
            output,
            block.type,
            block.props,
            blockConfig.propSchema,
            blockImplementation.meta?.fileBlockAccept !== undefined,
            this.blockContentDOMAttributes,
          ) satisfies NodeView;

          return nodeView;
        },
      },
      extensions: extensions,
    };
  };
}
