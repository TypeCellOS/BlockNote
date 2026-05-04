import { Editor, Node } from "@tiptap/core";
import { DOMParser, Fragment, TagParseRule } from "@tiptap/pm/model";
import { NodeView } from "@tiptap/pm/view";
import { mergeParagraphs } from "../../blocks/defaultBlockHelpers.js";
import {
  Extension,
  ExtensionFactoryInstance,
} from "../../editor/BlockNoteExtension.js";
import { PropSchema } from "../propTypes.js";
import {
  containerContentExpression,
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
  ContainerConfig,
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
      // Because we do the parsing ourselves, we want to preserve whitespace for content we've parsed
      preserveWhitespace: true,
      getContent:
        config.content === "inline" || config.content === "none"
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
                  preserveWhitespace: true,
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

function buildContainerNode<
  TName extends string,
  TProps extends PropSchema,
>(
  blockConfig: BlockConfig<TName, TProps, "none">,
  blockImplementation: BlockImplementation<TName, TProps, "none">,
  containerConfig: ContainerConfig,
  // priority is hardcoded inside the node spec below; the param is kept so the
  // caller signature mirrors the non-container path but is intentionally unused.
  _priority?: number,
) {
  return Node.create({
    name: blockConfig.type,
    content: containerContentExpression(containerConfig),
    group:
      containerConfig.topLevel === false
        ? "bnBlock childContainer"
        : "bnBlock childContainer blockGroupChild",
    // All bnBlock-group structural nodes carry these collab annotation marks
    // (see Doc, BlockGroup, BlockContainer, Table, Column/ColumnList).
    marks: "deletion insertion modification",
    selectable: blockImplementation.meta?.selectable ?? true,
    isolating: blockImplementation.meta?.isolating ?? true,
    defining: true,
    // Hardcoded priority 40 (matches the historical Column/ColumnList shape).
    // Why hardcoded and ignoring the caller-supplied priority? Because PM's
    // `fillBefore` picks the FIRST type in an or-expression / group when
    // auto-filling a non-optional node. With `blockGroupChild+` content
    // (which includes containers themselves), if a container appeared first
    // in the schema's `nodes` map, PM would try to auto-fill empty
    // containers with another container and stack-overflow. We need
    // `blockContainer` (priority 50, registered later) to come BEFORE
    // container blocks in the schema map. Tiptap registers higher-priority
    // extensions earlier, so we want our priority to be LOWER than 50.
    // The schema layer passes its own per-block priority (~101) but we
    // override it here for cycle-safety.
    priority: 40,
    addAttributes() {
      return propsToAttributes(blockConfig.propSchema);
    },

    parseHTML() {
      const rules: TagParseRule[] = [
        {
          tag: "*",
          getAttrs: (element) => {
            if (typeof element === "string") {
              return false;
            }
            if (element.getAttribute("data-node-type") === blockConfig.type) {
              return {};
            }
            return false;
          },
        },
      ];

      if (blockImplementation.parse) {
        rules.push({
          tag: "*",
          getAttrs(node) {
            if (typeof node === "string") {
              return false;
            }
            const props = blockImplementation.parse?.(node);
            if (props === undefined) {
              return false;
            }
            return props;
          },
          preserveWhitespace: true,
        });
      }

      return rules;
    },

    renderHTML({ HTMLAttributes }) {
      const div = document.createElement("div");
      div.setAttribute("data-node-type", blockConfig.type);
      for (const [attribute, value] of Object.entries(HTMLAttributes)) {
        div.setAttribute(attribute, value as any);
      }
      return {
        dom: div,
        contentDOM: div,
      };
    },

    addNodeView() {
      return (props) => {
        const editor = this.options.editor;
        // For container blocks the PM node IS the bnBlock (no blockContainer
        // wrapper), so the id lives on `props.node.attrs.id` directly. We
        // can't use getBlockFromPos here because it walks up to the parent.
        const blockIdentifier = (props.node.attrs as Record<string, any>).id;
        if (!blockIdentifier) {
          throw new Error(
            `Container block "${blockConfig.type}" is missing an id attribute. Make sure it is registered with UniqueID.`,
          );
        }
        const block = editor.getBlock(blockIdentifier);
        if (!block) {
          throw new Error(
            `Container block with id "${blockIdentifier}" not found.`,
          );
        }
        const blockContentDOMAttributes =
          this.options.domAttributes?.blockContent || {};

        const nodeView = blockImplementation.render.call(
          { blockContentDOMAttributes, props, renderType: "nodeView" },
          block as any,
          editor as any,
        ) as unknown as NodeView;

        if (blockImplementation.meta?.selectable === false) {
          applyNonSelectableBlockFix(nodeView, this.editor);
        }

        return nodeView;
      };
    },
  });
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
  extensions?: (ExtensionFactoryInstance | Extension)[],
  priority?: number,
): LooseBlockSpec<TName, TProps, TContent> {
  // Normalize the `container: true` shorthand once, here. Downstream code
  // sees `ContainerConfig | undefined` only.
  const containerConfig: ContainerConfig | undefined =
    blockConfig.container === true ? {} : blockConfig.container;
  blockConfig = { ...blockConfig, container: containerConfig };

  if (containerConfig && blockConfig.content !== "none") {
    throw new Error(
      `Block "${blockConfig.type}" sets \`container\` but its \`content\` is "${blockConfig.content}". Container blocks must declare \`content: "none"\`.`,
    );
  }

  const node =
    ((blockImplementation as any).node as Node) ||
    (containerConfig
      ? buildContainerNode(
          blockConfig as unknown as BlockConfig<TName, TProps, "none">,
          blockImplementation as unknown as BlockImplementation<
            TName,
            TProps,
            "none"
          >,
          containerConfig,
          priority,
        )
      : Node.create({
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

          // Cast needed because render returns `dom: HTMLElement | DocumentFragment`
          // but tiptap's NodeView expects `dom: HTMLElement`
          const typedNodeView = nodeView as unknown as NodeView;

          if (blockImplementation.meta?.selectable === false) {
            applyNonSelectableBlockFix(typedNodeView, this.editor);
          }

          // See explanation for why `update` is not implemented for NodeViews
          // https://github.com/TypeCellOS/BlockNote/pull/1904#discussion_r2313461464
          // TODO: in a future version, we might want to implement updates so that
          // vanilla blocks don't always re-render entirely (https://github.com/TypeCellOS/BlockNote/issues/220)
          return typedNodeView;
        };
      },
    }));

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
      toExternalHTML: (block, editor, context) => {
        const blockContentDOMAttributes =
          node.options.domAttributes?.blockContent || {};

        return (
          blockImplementation.toExternalHTML?.call(
            { blockContentDOMAttributes },
            block as any,
            editor as any,
            context,
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
  const TContent extends "inline" | "none",
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
  const TContent extends "inline" | "none",
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

          // Container blocks own their outer DOM entirely (the PM node IS
          // the bnBlock — no `blockContent` wrapper) — pass through.
          if (editor.pmSchema.nodes[block.type]?.isInGroup("bnBlock")) {
            return output;
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

          if (editor.pmSchema.nodes[block.type]?.isInGroup("bnBlock")) {
            return output;
          }

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
