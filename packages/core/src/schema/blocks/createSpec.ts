import { Editor, Node } from "@tiptap/core";
import {
  DOMParser,
  Fragment,
  Node as PMNode,
  TagParseRule,
} from "@tiptap/pm/model";
import { NodeView } from "@tiptap/pm/view";
import { mergeParagraphs } from "../../blocks/defaultBlockHelpers.js";
import {
  Extension,
  ExtensionFactoryInstance,
} from "../../editor/BlockNoteExtension.js";
import { nonFormattingMarks } from "../markGroups.js";
import { PropSchema } from "../propTypes.js";
import {
  getBlockFromPos,
  propsToAttributes,
  wrapInBlockStructure,
} from "./internal.js";
import {
  BlockConfig,
  BlockConfigOrCreator,
  BlockImplementation,
  BlockImplementationOrCreator,
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
  TContent extends "inline" | "none" | "table" | "plain",
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
      // Because we do the parsing ourselves, we want to preserve whitespace for content we've parsed
      preserveWhitespace: true,
      getContent:
        config.content === "inline" ||
        config.content === "none" ||
        config.content === "plain"
          ? (node, schema) => {
              if (implementation.parseContent) {
                const result = implementation.parseContent({
                  el: node as HTMLElement,
                  schema,
                });
                // parseContent may return undefined to fall through to
                // the default inline content parsing below.
                if (result !== undefined) {
                  return result;
                }
              }

              if (config.content === "inline" || config.content === "plain") {
                // Parse the inline content if it exists
                const element = node as HTMLElement;

                // Clone to avoid modifying the original
                const clone = element.cloneNode(true) as HTMLElement;

                // Merge multiple paragraphs into one with line breaks
                mergeParagraphs(
                  clone,
                  config.content === "plain" || implementation.meta?.code
                    ? "\n"
                    : "<br>",
                );

                // Parse the content directly as a paragraph to extract inline content
                const parser = DOMParser.fromSchema(schema);
                const parsed = parser.parse(clone, {
                  topNode: schema.nodes.paragraph.create(),
                  preserveWhitespace: true,
                });

                if (config.content === "plain") {
                  // Plain blocks hold text only, so non-text inline nodes are
                  // flattened: line breaks become newline characters and other
                  // nodes (e.g. mentions) are kept as their text.
                  const textNodes: PMNode[] = [];
                  parsed.content.forEach((child) => {
                    if (child.isText) {
                      textNodes.push(child);
                    } else {
                      const text =
                        child.type === schema.linebreakReplacement
                          ? "\n"
                          : child.textContent;
                      if (text) {
                        textNodes.push(schema.text(text, child.marks));
                      }
                    }
                  });

                  return Fragment.fromArray(textNodes);
                }
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
  TContent extends "inline" | "none" | "table" | "plain",
>(
  blockConfig: BlockConfig<TName, TProps, TContent>,
  blockImplementation: BlockImplementation<TName, TProps, TContent>,
  extensions?: (ExtensionFactoryInstance | Extension)[],
  priority?: number,
): LooseBlockSpec<TName, TProps, TContent> {
  const node =
    ((blockImplementation as any).node as Node) ||
    Node.create({
      name: blockConfig.type,
      content: (blockConfig.content === "inline"
        ? "inline*"
        : blockConfig.content === "plain"
          ? "text*"
          : blockConfig.content === "none"
            ? ""
            : blockConfig.content) as TContent extends "inline"
        ? "inline*"
        : TContent extends "plain"
          ? "text*"
          : "",
      // "plain" blocks hold unstyled text, so they disallow formatting marks.
      // They still allow the non-formatting marks (comments and
      // suggestions/diffs) — those annotate content without changing it and are
      // ignored by the block model. `nonFormattingMarks` resolves the group only
      // when at least one such mark is registered, so a plain block in an editor
      // without any of them doesn't reference an empty (unknown) mark group.
      marks() {
        return blockConfig.content === "plain"
          ? nonFormattingMarks(this.editor)
          : undefined;
      },
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
            contentDOM:
              blockConfig.content === "inline" ||
              blockConfig.content === "plain"
                ? div
                : undefined,
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
          const block = getBlockFromPos(props.getPos, props.view.state.doc);
          // Gets the custom HTML attributes for `blockContent` nodes
          const blockContentDOMAttributes =
            this.options.domAttributes?.blockContent || {};

          const nodeView = blockImplementation.render.call(
            {
              blockContentDOMAttributes,
              props,
              renderType: "nodeView",
              propSchema: blockConfig.propSchema,
            },
            block as any,
            editor as any,
          );

          // Cast needed because render returns `dom: HTMLElement | DocumentFragment`
          // but tiptap's NodeView expects `dom: HTMLElement`
          const typedNodeView = nodeView as unknown as NodeView;

          if (blockImplementation.meta?.selectable === false) {
            applyNonSelectableBlockFix(typedNodeView, this.editor);
          }

          // We don't add a default `update` method to the node view - when a
          // block doesn't provide one, ProseMirror keeps the node view and
          // reconciles its `contentDOM` in place as long as the node type stays
          // the same. Blocks that build custom DOM which needs to stay in sync
          // with the node (e.g. the code block's preview) can return an `update`
          // function from `render` to handle updates in place.
          // https://github.com/TypeCellOS/BlockNote/pull/1904#discussion_r2313461464
          // https://github.com/TypeCellOS/BlockNote/issues/220
          return typedNodeView;
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
            propSchema: blockConfig.propSchema,
          },
          block as any,
          editor as any,
        );
      },
      // TODO: this should not have wrapInBlockStructure and generally be a lot simpler
      // post-processing in externalHTMLExporter should not be necessary
      toExternalHTML: (block, editor, context) => {
        const blockContentDOMAttributes =
          node.options.domAttributes?.blockContent || {};

        return (
          blockImplementation.toExternalHTML?.call(
            { blockContentDOMAttributes, propSchema: blockConfig.propSchema },
            block as any,
            editor as any,
            context,
          ) ??
          blockImplementation.render.call(
            {
              blockContentDOMAttributes,
              renderType: "dom",
              props: undefined,
              propSchema: blockConfig.propSchema,
            },
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
  const TContent extends "inline" | "none" | "plain",
  const TOptions extends Partial<Record<string, any>> | undefined = undefined,
>(
  blockConfigOrCreator: BlockConfig<TName, TProps, TContent>,
  blockImplementationOrCreator: BlockImplementationOrCreator<
    BlockConfig<TName, TProps, TContent>,
    TOptions
  >,
  extensionsOrCreator?:
    | (ExtensionFactoryInstance | Extension)[]
    | (TOptions extends undefined
        ? () => (ExtensionFactoryInstance | Extension)[]
        : (
            options: Partial<TOptions>,
          ) => (ExtensionFactoryInstance | Extension)[]),
): (options?: Partial<TOptions>) => BlockSpec<TName, TProps, TContent>;
export function createBlockSpec<
  const TName extends string,
  const TProps extends PropSchema,
  const TContent extends "inline" | "none" | "plain",
  const BlockConf extends BlockConfig<TName, TProps, TContent>,
  const TOptions extends Partial<Record<string, any>>,
>(
  blockCreator: (options: Partial<TOptions>) => BlockConf,
  blockImplementationOrCreator: BlockImplementationOrCreator<
    BlockConf,
    TOptions
  >,
  extensionsOrCreator?:
    | (ExtensionFactoryInstance | Extension)[]
    | (TOptions extends undefined
        ? () => (ExtensionFactoryInstance | Extension)[]
        : (
            options: Partial<TOptions>,
          ) => (ExtensionFactoryInstance | Extension)[]),
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
  const TContent extends "inline" | "none" | "plain",
  const TOptions extends Partial<Record<string, any>> | undefined = undefined,
>(
  blockConfigOrCreator: BlockConfigOrCreator<TName, TProps, TContent, TOptions>,
  blockImplementationOrCreator: BlockImplementationOrCreator<
    BlockConfig<TName, TProps, TContent>,
    TOptions
  >,
  extensionsOrCreator?:
    | (ExtensionFactoryInstance | Extension)[]
    | (TOptions extends undefined
        ? () => (ExtensionFactoryInstance | Extension)[]
        : (
            options: Partial<TOptions>,
          ) => (ExtensionFactoryInstance | Extension)[]),
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
        toExternalHTML(block, editor, context) {
          const output = blockImplementation.toExternalHTML?.call(
            { blockContentDOMAttributes: this.blockContentDOMAttributes },
            block as any,
            editor as any,
            context,
          );

          if (output === undefined) {
            return undefined;
          }

          return wrapInBlockStructure(
            output,
            block.type,
            block.props,
            this.propSchema ?? blockConfig.propSchema,
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
            this.propSchema ?? blockConfig.propSchema,
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
