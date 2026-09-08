import { Editor, Node, NodeViewRendererProps } from "@tiptap/core";
import {
  DOMParser,
  Fragment,
  Node as PMNode,
  TagParseRule,
} from "@tiptap/pm/model";
import { NodeView } from "@tiptap/pm/view";
import { nodeToBlock } from "../../api/nodeConversions/nodeToBlock.js";
import { mergeParagraphs } from "../../blocks/defaultBlockHelpers.js";
import {
  Extension,
  ExtensionFactoryInstance,
} from "../../editor/BlockNoteExtension.js";
import { nonFormattingMarks } from "../markGroups.js";
import { ignoreNonContentMutations } from "../nodeViewMutations.js";
import { suggestionMarks } from "../../pm-nodes/suggestionMarks.js";
import { PropSchema } from "../propTypes.js";
import {
  BLOCK_GROUP_CHILD_GROUP,
  CHILD_CONTAINER_GROUP,
  childrenContentExpression,
  containerNodePriority,
  isContainerConfig,
} from "./children.js";
import { applyContainerAttributes } from "./containerAttributes.js";
import {
  applyDOMAttributes,
  getBlockFromNodeView,
  isDocumentFragment,
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

// Finds the element holding a serialized container block's children, marked
// `data-children-of` by the internal HTML serializer. Returns undefined when
// no marker belonging to *this* block (rather than a same-typed nested
// container) is present.
function findContainerContentElement(
  el: HTMLElement,
  config: { type: string },
): HTMLElement | undefined {
  const selector = `[data-children-of="${config.type}"]`;

  // The block's root may itself be the children host (a render that passes
  // its own root to `contentRef`). `querySelectorAll` only sees descendants.
  if (el.matches(selector)) {
    return el;
  }

  for (const host of el.querySelectorAll<HTMLElement>(selector)) {
    // Skip hosts of same-typed *nested* containers: this block's own host is
    // the one with no other container root between it and `el`.
    if (host.parentElement?.closest("[data-node-type]") === el) {
      return host;
    }
  }

  return undefined;
}

// Custom parsing, followed by the default parser for the block's content kind.
function blockContentParser<
  TName extends string,
  TProps extends PropSchema,
  TContent extends "inline" | "none" | "table" | "plain",
>(
  config: BlockConfig<TName, TProps, TContent>,
  implementation: BlockImplementation<TName, TProps, TContent>,
): TagParseRule["getContent"] | undefined {
  const isContainer = isContainerConfig(config);
  if (
    config.content === "table" ||
    (isContainer && !implementation.parseContent)
  ) {
    // Tables use their own rules. Containers without parseContent use PM's
    // normal child parsing, including wrapping inline runs as paragraphs.
    return undefined;
  }

  return (node, schema) => {
    if (implementation.parseContent) {
      const result = implementation.parseContent({
        el: node as HTMLElement,
        schema,
      });
      // parseContent may return undefined to fall through to the default
      // inline content parsing below.
      if (result !== undefined) {
        return result;
      }
    }

    if (isContainer) {
      return DOMParser.fromSchema(schema).parse(node as HTMLElement, {
        topNode: schema.nodes["blockGroup"].create(),
        preserveWhitespace: true,
      }).content;
    }

    if (config.content === "none") {
      return Fragment.empty;
    }

    // Cloned so merging doesn't modify the element being parsed.
    const clone = (node as HTMLElement).cloneNode(true) as HTMLElement;
    // Merge multiple paragraphs into one with line breaks
    mergeParagraphs(
      clone,
      config.content === "plain" || implementation.meta?.code ? "\n" : "<br>",
    );

    // Parsed as a paragraph, to extract the inline content by itself.
    const parsed = DOMParser.fromSchema(schema).parse(clone, {
      topNode: schema.nodes.paragraph.create(),
      preserveWhitespace: config.content === "plain" ? "full" : true,
    });

    if (config.content === "inline") {
      return parsed.content;
    }

    // Plain blocks hold text only, so non-text inline nodes are flattened:
    // line breaks become newline characters and other nodes (e.g. mentions)
    // are kept as their text.
    const textNodes: PMNode[] = [];
    parsed.content.forEach((child) => {
      if (child.isText) {
        textNodes.push(child);
        return;
      }
      const text =
        child.type === schema.linebreakReplacement ? "\n" : child.textContent;
      if (text) {
        textNodes.push(schema.text(text, child.marks));
      }
    });

    return Fragment.fromArray(textNodes);
  };
}

// Creates `parseHTML` rules for clipboard parsing.
export function getParseRules<
  TName extends string,
  TProps extends PropSchema,
  TContent extends "inline" | "none" | "table" | "plain",
>(
  config: BlockConfig<TName, TProps, TContent>,
  implementation: BlockImplementation<TName, TProps, TContent>,
) {
  const isContainer = isContainerConfig(config);

  const rules: TagParseRule[] = [
    isContainer
      ? {
          tag: `[data-node-type=${config.type}]`,
          // Scope the round-trip parse to the block's content region, so text
          // the render puts elsewhere in its DOM (button labels, captions,
          // ...) doesn't parse back as document content. The internal HTML
          // serializer marks the region with `data-children-of`; HTML without
          // the marker (older or hand-written) falls back to the whole
          // element, the previous behavior.
          contentElement: (el) =>
            findContainerContentElement(el as HTMLElement, config) ??
            (el as HTMLElement),
        }
      : {
          tag: "[data-content-type=" + config.type + "]",
          contentElement: ".bn-inline-content",
          preserveWhitespace: config.content === "plain" ? "full" : undefined,
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
      getContent: blockContentParser(config, implementation),
    });
  }

  return rules;
}

export function containerRootDOM(output: {
  dom: HTMLElement | DocumentFragment;
}): HTMLElement | null {
  if (isDocumentFragment(output.dom)) {
    // A fragment can't hold attributes, so the round-trip markers
    // (`data-node-type`, prop `data-*`) would be lost with it as the root.
    // When it wraps a single element (the shape a React render produces),
    // that element is the block's real root. A multi-element fragment has no
    // root to mark, so its container HTML can't parse back.
    return output.dom.children.length === 1
      ? (output.dom.children[0] as HTMLElement)
      : null;
  }
  return output.dom;
}

function blockNodeView<
  TName extends string,
  TProps extends PropSchema,
  TContent extends "inline" | "none" | "table" | "plain",
>(
  blockConfig: BlockConfig<TName, TProps, TContent>,
  blockImplementation: BlockImplementation<TName, TProps, TContent>,
  props: NodeViewRendererProps,
): NodeView {
  const isContainer = isContainerConfig(blockConfig);
  const block = isContainer
    ? nodeToBlock(props.node, props.view.state.doc)
    : getBlockFromNodeView(props.getPos, props.node, props.view.state.doc);
  const nodeView = blockImplementation.render.call(
    {
      blockContentDOMAttributes:
        props.extension.options.domAttributes?.blockContent || {},
      props,
      renderType: "nodeView",
      propSchema: blockConfig.propSchema,
    },
    block as any,
    props.extension.options.editor,
  );

  const typedNodeView = nodeView as unknown as NodeView;

  if (blockImplementation.meta?.selectable === false) {
    applyNonSelectableBlockFix(typedNodeView, props.editor);
  }

  ignoreNonContentMutations(typedNodeView);

  if (!isContainer) {
    return typedNodeView;
  }

  applyContainerAttributes(
    containerRootDOM(nodeView),
    blockConfig.type,
    block.props as any,
    blockConfig.propSchema,
    block.id,
  );

  // Mark the children host in the live DOM, mirroring what the internal HTML
  // serializer emits, so the container's round-trip parse rule can scope
  // itself to it (`contentElement` in `getParseRules`) when ProseMirror
  // re-reads editor DOM.
  if (typedNodeView.contentDOM) {
    (typedNodeView.contentDOM as HTMLElement).setAttribute(
      "data-children-of",
      blockConfig.type,
    );
  }

  const update = typedNodeView.update?.bind(typedNodeView);
  if (update) {
    typedNodeView.update = (node, decorations, innerDecorations) => {
      if (node.type.name !== blockConfig.type) {
        return false;
      }
      if (update(node, decorations, innerDecorations) === false) {
        return false;
      }
      applyContainerAttributes(
        containerRootDOM(nodeView),
        blockConfig.type,
        nodeToBlock(node, props.view.state.doc).props as any,
        blockConfig.propSchema,
        node.attrs.id,
      );
      return true;
    };
  }

  return typedNodeView;
}

function buildNode<
  TName extends string,
  TProps extends PropSchema,
  TContent extends "inline" | "none" | "table" | "plain",
>(
  blockConfig: BlockConfig<TName, TProps, TContent>,
  blockImplementation: BlockImplementation<TName, TProps, TContent>,
  priority?: number,
) {
  const isContainer = isContainerConfig(blockConfig);
  return Node.create({
    name: blockConfig.type,
    content: isContainer
      ? childrenContentExpression(blockConfig.children!)
      : blockConfig.content === "inline"
        ? "inline*"
        : blockConfig.content === "plain"
          ? "text*"
          : blockConfig.content === "none"
            ? ""
            : blockConfig.content,
    // "plain" blocks hold unstyled text, so they disallow formatting marks.
    // They still allow the non-formatting marks (comments and
    // suggestions/diffs), which annotate content without changing it and are
    // ignored by the block model. `nonFormattingMarks` resolves the group only
    // when at least one such mark is registered, so a plain block in an editor
    // without any of them doesn't reference an empty (unknown) mark group.
    marks() {
      return isContainer
        ? suggestionMarks(this.editor)
        : blockConfig.content === "plain"
          ? nonFormattingMarks(this.editor)
          : undefined;
    },
    group: isContainer
      ? [
          "bnBlock",
          CHILD_CONTAINER_GROUP,
          ...(blockConfig.placeable === "namedOnly"
            ? []
            : [BLOCK_GROUP_CHILD_GROUP]),
        ].join(" ")
      : "blockContent",
    selectable: blockImplementation.meta?.selectable ?? true,
    // Containers must remain open to paste across their edges; isolating
    // makes ProseMirror wrap spanning slices in a spurious blockGroup.
    isolating: isContainer
      ? false
      : (blockImplementation.meta?.isolating ?? true),
    code: isContainer ? false : (blockImplementation.meta?.code ?? false),
    defining: isContainer ? true : (blockImplementation.meta?.defining ?? true),
    priority: isContainer ? containerNodePriority(priority) : priority,
    addAttributes() {
      return propsToAttributes(blockConfig.propSchema);
    },

    parseHTML() {
      return getParseRules(blockConfig, blockImplementation);
    },

    renderHTML({ HTMLAttributes }) {
      if (isContainer) {
        const dom = document.createElement("div");
        dom.setAttribute("data-node-type", blockConfig.type);
        for (const [attribute, value] of Object.entries(HTMLAttributes)) {
          dom.setAttribute(attribute, value as string);
        }
        return { dom, contentDOM: dom };
      }

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
            blockConfig.content === "inline" || blockConfig.content === "plain"
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
      return (props) => blockNodeView(blockConfig, blockImplementation, props);
    },
  });
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
  // Only a contentless block builds a container node. A block with content of
  // its own keeps its ordinary shape, and its `children` are owned children
  // instead.
  const isContainer = isContainerConfig(blockConfig);

  const builtNode: Node =
    (blockImplementation as any).node ??
    buildNode(blockConfig, blockImplementation, priority);

  if (builtNode.name !== blockConfig.type) {
    throw new Error(
      "Node name does not match block type. This is a bug in BlockNote.",
    );
  }

  if (!blockImplementation.render) {
    throw new Error(`Block "${blockConfig.type}" must declare \`render\`.`);
  }
  if (isContainer && blockImplementation.renderFrame) {
    throw new Error(
      `Container block "${blockConfig.type}" draws its box in \`render\`; \`renderFrame\` requires a separate content node.`,
    );
  }

  // The block's config is stored on its node's PM spec
  // (`NodeSpec.blockConfig`), so code holding a bare `Node` can consult it
  // without an editor or schema reference. (`extendNodeSchema` hooks run
  // for every node in the schema, hence the name gate.)
  const node = builtNode.extend({
    extendNodeSchema(extension) {
      return extension.name === builtNode.name ? { blockConfig } : {};
    },
  });

  function serialize(
    block: Parameters<LooseBlockSpec["implementation"]["render"]>[0],
    editor: Parameters<LooseBlockSpec["implementation"]["render"]>[1],
    context?: { nestingLevel: number },
  ) {
    const blockContentDOMAttributes =
      node.options.domAttributes?.blockContent || {};
    const external =
      context &&
      blockImplementation.toExternalHTML?.call(
        { blockContentDOMAttributes, propSchema: blockConfig.propSchema },
        block,
        editor as any,
        context,
      );
    const output =
      external ??
      blockImplementation.render.call(
        {
          blockContentDOMAttributes,
          props: undefined,
          renderType: "dom",
          propSchema: blockConfig.propSchema,
        },
        block,
        editor as any,
      );

    if (isContainer) {
      applyContainerAttributes(
        containerRootDOM(output),
        blockConfig.type,
        block.props,
        blockConfig.propSchema,
        block.id,
      );
    } else if (context && !external) {
      // An explicit external renderer owns the complete export. Otherwise
      // wrap the default content and children in the editor's frame.
      const frame = blockImplementation.renderFrame?.call(
        { renderType: "dom", props: undefined, blockContentDOMAttributes },
        block,
        editor as any,
      );
      if (frame) {
        frame.slot.append(output.dom);
        return { ...output, dom: frame.dom, childrenDOM: frame.slot };
      }
    }
    return output;
  }

  return {
    config: blockConfig,
    implementation: {
      ...blockImplementation,
      node,
      render: serialize,
      toExternalHTML: serialize,
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

    // Only a contentless block is a container here. A block with content of
    // its own keeps its ordinary shape, and its `children` are owned children
    // instead.
    const isContainer = isContainerConfig(blockConfig);

    // Keep the existing render contract, including for JS callers.
    if (!blockImplementation.render) {
      throw new Error(`Block "${blockConfig.type}" must declare \`render\`.`);
    }

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

          if (isContainer) {
            applyDOMAttributes(output.dom, this.blockContentDOMAttributes);
            return output;
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

          if (isContainer) {
            applyDOMAttributes(output.dom, this.blockContentDOMAttributes);
            return output;
          }

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
