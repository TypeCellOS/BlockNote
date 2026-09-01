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
  ANY_CONTAINER_GROUP,
  BLOCK_GROUP_CHILD_GROUP,
  CHILD_CONTAINER_GROUP,
  childrenContentExpression,
  containerNodePriority,
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

/**
 * What a container block's custom `parse` rule reads its children from.
 * `undefined` when the block has no `parseContent`: without one there is
 * nothing to say beyond the rule's default child parsing.
 */
function containerChildrenParser<
  TName extends string,
  TProps extends PropSchema,
  TContent extends "inline" | "none" | "table" | "plain",
>(
  implementation: BlockImplementation<TName, TProps, TContent>,
): TagParseRule["getContent"] | undefined {
  const parseContent = implementation.parseContent;
  if (!parseContent) {
    return undefined;
  }

  return (node, schema) => {
    const parsed =
      parseContent({ el: node as HTMLElement, schema }) ??
      DOMParser.fromSchema(schema).parse(node as HTMLElement, {
        topNode: schema.nodes["blockGroup"].create(),
        preserveWhitespace: true,
      }).content;

    // A container holds blocks, so any inline run `parseContent` returned is
    // wrapped in a paragraph to fit its content expression.
    const children: PMNode[] = [];
    let inlineRun: PMNode[] = [];
    const flushInlineRun = () => {
      if (inlineRun.length > 0) {
        children.push(schema.nodes["paragraph"].create(null, inlineRun));
        inlineRun = [];
      }
    };

    parsed.forEach((child) => {
      if (child.isInline) {
        inlineRun.push(child);
        return;
      }
      flushInlineRun();
      children.push(child);
    });
    flushInlineRun();

    return Fragment.fromArray(children);
  };
}

/**
 * What a regular block's custom `parse` rule reads its content from:
 * `parseContent` if the block has one, falling back to parsing the element's
 * inline content. `undefined` for a `table`, whose content the block's own
 * parse rules handle.
 */
function blockContentParser<
  TName extends string,
  TProps extends PropSchema,
  TContent extends "inline" | "none" | "table" | "plain",
>(
  config: BlockConfig<TName, TProps, TContent>,
  implementation: BlockImplementation<TName, TProps, TContent>,
): TagParseRule["getContent"] | undefined {
  if (
    config.content !== "inline" &&
    config.content !== "none" &&
    config.content !== "plain"
  ) {
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
      preserveWhitespace: true,
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
  kind: "regular" | "container" = "regular",
) {
  const isContainer = kind === "container";

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
      getContent: isContainer
        ? containerChildrenParser(implementation)
        : blockContentParser(config, implementation),
    });
  }

  return rules;
}

function buildContainerNode<TName extends string, TProps extends PropSchema>(
  blockConfig: BlockConfig<TName, TProps, "none">,
  blockImplementation: BlockImplementation<TName, TProps, "none">,
  priority?: number,
) {
  const children = blockConfig.children!;

  const groups = ["bnBlock", CHILD_CONTAINER_GROUP];
  if (blockConfig.placement !== "containerOnly") {
    groups.push(BLOCK_GROUP_CHILD_GROUP, ANY_CONTAINER_GROUP);
  }

  return Node.create({
    name: blockConfig.type,
    content: childrenContentExpression(children),
    group: groups.join(" "),
    marks() {
      return suggestionMarks(this.editor);
    },
    selectable: blockImplementation.meta?.selectable ?? true,
    // Deliberately not `isolating`, not even for a sealed container. PM only
    // honours that flag while no selection spans the edge, and nothing stops
    // one being made: given a spanning slice, `Fitter` refuses to open into
    // the container and wraps the content in a spurious `blockGroup` instead,
    // so a copy-paste across the edge corrupts the document. Seals bind
    // editing gestures, and those are enforced by BlockNote's own `isSealed`
    // guards (see `containerNav.ts` and `KeyboardShortcutsExtension.ts`),
    // which need no help from the schema.
    defining: true,
    priority: containerNodePriority(priority),
    addAttributes() {
      return propsToAttributes(blockConfig.propSchema);
    },

    parseHTML() {
      return getParseRules(blockConfig, blockImplementation, "container");
    },

    renderHTML({ HTMLAttributes }) {
      const dom = document.createElement("div");
      dom.setAttribute("data-node-type", blockConfig.type);
      for (const [attribute, value] of Object.entries(HTMLAttributes)) {
        dom.setAttribute(attribute, value as string);
      }
      return { dom, contentDOM: dom };
    },

    addNodeView() {
      return (props) =>
        containerNodeView(blockConfig, blockImplementation, props, {
          editor: this.options.editor,
          tiptapEditor: this.editor,
          blockContentDOMAttributes:
            this.options.domAttributes?.blockContent || {},
        });
    },
  });
}

export function containerRootDOM(output: {
  dom: HTMLElement | DocumentFragment;
  rootDOM?: HTMLElement | null;
}): HTMLElement | null {
  if (output.rootDOM !== undefined) {
    return output.rootDOM;
  }
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

function containerNodeView<TName extends string, TProps extends PropSchema>(
  blockConfig: BlockConfig<TName, TProps, "none">,
  blockImplementation: BlockImplementation<TName, TProps, "none">,
  props: NodeViewRendererProps,
  context: {
    editor: unknown;
    tiptapEditor: Editor;
    blockContentDOMAttributes: Record<string, string>;
  },
): NodeView {
  const block = nodeToBlock(props.node, props.view.state.doc);

  const nodeView = blockImplementation.render.call(
    {
      blockContentDOMAttributes: context.blockContentDOMAttributes,
      props,
      renderType: "nodeView",
      propSchema: blockConfig.propSchema,
    },
    block as any,
    context.editor as any,
  );

  applyContainerAttributes(
    containerRootDOM(nodeView),
    blockConfig.type,
    block.props as any,
    blockConfig.propSchema,
    { id: block.id, mode: "overwrite" },
  );

  const typedNodeView = nodeView as unknown as NodeView;

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

  if (blockImplementation.meta?.selectable === false) {
    applyNonSelectableBlockFix(typedNodeView, context.tiptapEditor);
  }

  ignoreNonContentMutations(typedNodeView);

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
        { id: node.attrs.id, mode: "overwrite" },
      );
      return true;
    };
  }

  return typedNodeView;
}

function buildRegularNode<
  TName extends string,
  TProps extends PropSchema,
  TContent extends "inline" | "none" | "table" | "plain",
>(
  blockConfig: BlockConfig<TName, TProps, TContent>,
  blockImplementation: BlockImplementation<TName, TProps, TContent>,
  priority?: number,
) {
  return Node.create({
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
    // suggestions/diffs), which annotate content without changing it and are
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
      return (props) => {
        // Gets the BlockNote editor instance
        const editor = this.options.editor;
        // Gets the block. Resolving this can't rely on `getPos()` alone:
        // node views are constructed part-way through ProseMirror's
        // reconciliation, where positions don't always line up with
        // `view.state.doc` yet (see `getBlockFromNodeView`).
        const block = getBlockFromNodeView(
          props.getPos,
          props.node,
          props.view.state.doc,
        );
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

        // Ignores DOM mutations that don't affect the block's content, so
        // that browser extensions which rewrite the DOM (e.g. Dark Reader)
        // can't trigger an infinite re-render loop that freezes the tab.
        ignoreNonContentMutations(typedNodeView);

        // See explanation for why `update` is not implemented for NodeViews
        // https://github.com/TypeCellOS/BlockNote/pull/1904#discussion_r2313461464
        // TODO: in a future version, we might want to implement updates so that
        // vanilla blocks don't always re-render entirely (https://github.com/TypeCellOS/BlockNote/issues/220)
        return typedNodeView;
      };
    },
  });
}

// What `buildRegularNode` generates for each `content` kind.
const CONTENT_EXPRESSIONS: Record<BlockConfig["content"], string> = {
  inline: "inline*",
  plain: "text*",
  none: "",
  table: "tableRow+",
};

/**
 * Checks a hand-written node's content expression against the `content` its
 * spec declares — the one `getBlockInfoFromPos` reports as the block's
 * `contentKind`, without looking at the node. A generated node's expression
 * comes from that same config, so this only bites on a hand-written one
 * (`createBlockSpecFromTiptapNode`).
 */
function checkNodeMatchesConfig(node: Node, blockConfig: BlockConfig) {
  // A container's node holds blocks rather than content, and its expression
  // comes from `children` instead.
  if (blockConfig.children !== undefined) {
    return;
  }

  // tiptap allows the expression to be a function of the editor, in which case
  // there is nothing to compare yet.
  const content = node.config.content;
  if (content !== undefined && typeof content !== "string") {
    return;
  }

  const expected = CONTENT_EXPRESSIONS[blockConfig.content];
  if ((content ?? "") !== expected) {
    throw new Error(
      `Block "${blockConfig.type}" declares \`content: "${blockConfig.content}"\`, ` +
        `but its node holds "${content ?? ""}" rather than "${expected}".`,
    );
  }
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
  const childrenConfig = blockConfig.children;

  const isContainer = childrenConfig !== undefined;

  const builtNode: Node = (blockImplementation as any).node
    ? ((blockImplementation as any).node as Node)
    : childrenConfig
      ? buildContainerNode(
          blockConfig as unknown as BlockConfig<TName, TProps, "none">,
          blockImplementation as unknown as BlockImplementation<
            TName,
            TProps,
            "none"
          >,
          priority,
        )
      : buildRegularNode(blockConfig, blockImplementation, priority);

  if (builtNode.name !== blockConfig.type) {
    throw new Error(
      "Node name does not match block type. This is a bug in BlockNote.",
    );
  }

  checkNodeMatchesConfig(builtNode, blockConfig as BlockConfig);

  // The block's config is stored on its node's PM spec
  // (`NodeSpec.blockConfig`), so code holding a bare `Node` can consult it
  // without an editor or schema reference. (`extendNodeSchema` hooks run
  // for every node in the schema, hence the name gate.)
  const node = builtNode.extend({
    extendNodeSchema(extension) {
      return extension.name === builtNode.name ? { blockConfig } : {};
    },
  });

  return {
    config: blockConfig,
    implementation: {
      ...blockImplementation,
      node,
      render(block, editor) {
        const blockContentDOMAttributes =
          node.options.domAttributes?.blockContent || {};

        const output = blockImplementation.render.call(
          {
            blockContentDOMAttributes,
            props: undefined,
            renderType: "dom",
            propSchema: blockConfig.propSchema,
          },
          block as any,
          editor as any,
        );

        if (isContainer) {
          applyContainerAttributes(
            containerRootDOM(output),
            blockConfig.type,
            block.props,
            blockConfig.propSchema,
            { id: block.id, mode: "overwrite" },
          );
        }

        return output;
      },
      // TODO: this should not have wrapInBlockStructure and generally be a lot simpler
      // post-processing in externalHTMLExporter should not be necessary
      toExternalHTML: (block, editor, context) => {
        const blockContentDOMAttributes =
          node.options.domAttributes?.blockContent || {};

        const output =
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
          );

        if (output && isContainer) {
          applyContainerAttributes(
            containerRootDOM(output),
            blockConfig.type,
            block.props,
            blockConfig.propSchema,
            { id: block.id, mode: "overwrite" },
          );
        }

        return output;
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

    const isContainer = blockConfig.children !== undefined;

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
