import { Editor, Node, NodeConfig, NodeViewRendererProps } from "@tiptap/core";
import {
  DOMParser,
  Fragment,
  Node as PMNode,
  TagParseRule,
} from "@tiptap/pm/model";
import { NodeView } from "@tiptap/pm/view";
import { mergeParagraphs } from "../../blocks/defaultBlockHelpers.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  Extension,
  ExtensionFactoryInstance,
} from "../../editor/BlockNoteExtension.js";
import { suggestionMarks } from "../../pm-nodes/suggestionMarks.js";
import { nonFormattingMarks } from "../markGroups.js";
import { ignoreDarkReaderMutations } from "../nodeViewMutations.js";
import { PropSchema } from "../propTypes.js";
import {
  BLOCK_GROUP_CHILD_GROUP,
  CHILD_CONTAINER_GROUP,
  anyBlocksExpression,
  childrenContentExpression,
  layoutNodePriority,
} from "./children.js";
import { applyDataAttributes } from "../dataAttributes.js";
import { blockFrameView, findFrameSlot, frameNodeViewHooks } from "./frame.js";
import {
  applyDOMAttributes,
  getBlockFromNodeView,
  isDocumentFragment,
  propsToAttributes,
  wrapInBlockStructure,
} from "./internal.js";
import { createBlockKeyboard } from "./keyboard.js";
import { resolveBlockMeta } from "./meta.js";
import {
  BlockConfig,
  BlockConfigOrCreator,
  BlockImplementation,
  BlockImplementationOrCreator,
  BlockSpec,
  ChildrenConfig,
  LooseBlockSpec,
  ResolvedBlockConfigMeta,
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

// Custom parsing, followed by the default parser for the block's content kind.
function blockContentParser<
  TName extends string,
  TProps extends PropSchema,
  TContent extends "inline" | "none" | "table" | "plain",
>(
  config: BlockConfig<TName, TProps, TContent>,
  implementation: BlockImplementation<TName, TProps, TContent>,
): TagParseRule["getContent"] | undefined {
  const isLayoutBlock = config.layoutOnly === true;
  if (
    config.content === "table" ||
    (isLayoutBlock && !implementation.parseContent)
  ) {
    // Tables use their own rules. Layout blocks without parseContent use PM's
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

    if (isLayoutBlock) {
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
  const isLayoutBlock = config.layoutOnly === true;

  const rules: TagParseRule[] = [
    isLayoutBlock
      ? {
          tag: `[data-node-type=${config.type}]`,
          // Scope the round-trip parse to the frame's slot, so chrome the
          // frame draws around it (button labels, captions, ...) doesn't
          // parse back as document content. HTML without the marker
          // (hand-written) falls back to the whole element.
          contentElement: (el) =>
            findFrameSlot(el as HTMLElement) ?? (el as HTMLElement),
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

/**
 * Checks that a block declares the render hooks its config calls for: a
 * layout block (`layoutOnly: true`) has no content, so it declares only
 * `renderFrame`; every other block declares `render`.
 *
 * FIXME: return the checked hooks as a discriminated union
 * (`{ kind: "render", render } | { kind: "frame", renderFrame }`), so callers
 * don't need `!` on `render`/`renderFrame` afterwards.
 */
export function validateRenderHooks(
  blockConfig: Pick<BlockConfig, "type" | "layoutOnly">,
  implementation: { render?: unknown; renderFrame?: unknown },
) {
  if (blockConfig.layoutOnly !== true) {
    if (!implementation.render) {
      throw new Error(`Block "${blockConfig.type}" must declare \`render\`.`);
    }
    return;
  }
  if (implementation.render) {
    throw new Error(
      `Layout block "${blockConfig.type}" draws its box in \`renderFrame\`, and has no content for \`render\` to draw.`,
    );
  }
  if (!implementation.renderFrame) {
    throw new Error(
      `Layout block "${blockConfig.type}" must declare \`renderFrame\`.`,
    );
  }
}

/** A block implementation with its `meta` resolved (see `resolveBlockMeta`). */
type ResolvedBlockImplementation<
  TName extends string,
  TProps extends PropSchema,
  TContent extends "inline" | "none" | "table" | "plain",
> = Omit<BlockImplementation<TName, TProps, TContent>, "meta"> & {
  meta: ResolvedBlockConfigMeta<TName, TProps>;
};

/** A layout block's node view: its frame. */
function layoutNodeView<
  TName extends string,
  TProps extends PropSchema,
  TContent extends "inline" | "none" | "table" | "plain",
>(
  blockImplementation: ResolvedBlockImplementation<TName, TProps, TContent>,
  props: NodeViewRendererProps,
): NodeView {
  // React draws its own frame and stamps it; core stamps a vanilla one.
  const frame = blockFrameView({
    props,
    editor: props.extension.options.editor,
    blockNode: (node) => node,
  });
  const nodeView: NodeView = {
    dom: frame.dom,
    contentDOM: frame.slot,
    update(node, decorations, innerDecorations) {
      if (node.attrs.id !== frame.node.attrs.id) {
        // ProseMirror offers a view whose node is gone to the next node of
        // the same type. Return `false`: the frame shows another block, so
        // draw this block's own frame.
        return false;
      }
      // The same block. Return the frame's answer: `true` keeps it.
      return frame.update(node, decorations, innerDecorations);
    },
    ...frameNodeViewHooks(frame),
  };
  if (!blockImplementation.meta.selectable) {
    applyNonSelectableBlockFix(nodeView, props.editor);
  }
  return nodeView;
}

function blockNodeView<
  TName extends string,
  TProps extends PropSchema,
  TContent extends "inline" | "none" | "table" | "plain",
>(
  blockConfig: BlockConfig<TName, TProps, TContent>,
  blockImplementation: ResolvedBlockImplementation<TName, TProps, TContent>,
  props: NodeViewRendererProps,
): NodeView {
  if (blockConfig.layoutOnly === true) {
    return layoutNodeView(blockImplementation, props);
  }
  const block = getBlockFromNodeView(
    props.getPos,
    props.node,
    props.view.state.doc,
  );
  const nodeView = blockImplementation.render!.call(
    {
      blockContentDOMAttributes:
        props.extension.options.domAttributes?.blockContent || {},
      props,
      renderType: "nodeView",
      propSchema: blockConfig.propSchema,
    },
    block as any,
    props.extension.options.editor,
  ) as unknown as NodeView;

  if (!blockImplementation.meta.selectable) {
    applyNonSelectableBlockFix(nodeView, props.editor);
  }

  // Ignores Dark Reader's rewrites of the block's DOM, which would otherwise
  // trigger an infinite re-render loop that freezes the tab.
  ignoreDarkReaderMutations(nodeView);

  return nodeView;
}

/**
 * A layout block node's content expression. A layout block that excludes types
 * needs the schema's other layout block types spelled out, which only the
 * editor's schema knows: tiptap accepts a function here and calls it when
 * the editor builds its ProseMirror schema, with the configured options.
 */
function layoutNodeContent(
  children: ChildrenConfig | undefined,
): NodeConfig<{ editor: BlockNoteEditor<any, any, any> }>["content"] {
  const exclude =
    children !== undefined && "exclude" in children ? children.exclude : [];
  if (exclude === undefined || exclude.length === 0) {
    return childrenContentExpression(children);
  }
  return function () {
    return childrenContentExpression(
      children,
      anyBlocksExpression(exclude, this.options.editor.schema.blockSpecs),
    );
  };
}

function buildNode<
  TName extends string,
  TProps extends PropSchema,
  TContent extends "inline" | "none" | "table" | "plain",
>(
  blockConfig: BlockConfig<TName, TProps, TContent>,
  blockImplementation: ResolvedBlockImplementation<TName, TProps, TContent>,
  priority?: number,
) {
  const isLayoutBlock = blockConfig.layoutOnly === true;
  return Node.create({
    name: blockConfig.type,
    content: isLayoutBlock
      ? layoutNodeContent(blockConfig.children)
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
      return isLayoutBlock
        ? suggestionMarks(this.editor)
        : blockConfig.content === "plain"
          ? nonFormattingMarks(this.editor)
          : undefined;
    },
    group: isLayoutBlock
      ? [
          "bnBlock",
          CHILD_CONTAINER_GROUP,
          ...(blockConfig.placeable === "namedOnly"
            ? []
            : [BLOCK_GROUP_CHILD_GROUP]),
        ].join(" ")
      : "blockContent",
    // The node flags come resolved, layout block rules included (see
    // `resolveBlockMeta`).
    selectable: blockImplementation.meta.selectable,
    isolating: blockImplementation.meta.isolating,
    code: blockImplementation.meta.code,
    defining: blockImplementation.meta.defining,
    priority: isLayoutBlock ? layoutNodePriority(priority) : priority,
    addAttributes() {
      return propsToAttributes(blockConfig.propSchema);
    },

    parseHTML() {
      return getParseRules(blockConfig, blockImplementation);
    },

    renderHTML({ HTMLAttributes }) {
      if (isLayoutBlock) {
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
        blockImplementation.meta.fileBlockAccept !== undefined,
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
  // Only a block declared `layoutOnly: true` builds a layout block node, which
  // holds its children. Every other block keeps its ordinary shape.
  const isLayoutBlock = blockConfig.layoutOnly === true;
  const implementation: ResolvedBlockImplementation<TName, TProps, TContent> = {
    ...blockImplementation,
    meta: resolveBlockMeta(blockImplementation.meta, blockConfig),
  };

  const builtNode: Node =
    (implementation as any).node ??
    buildNode(blockConfig, implementation, priority);

  if (builtNode.name !== blockConfig.type) {
    throw new Error(
      "Node name does not match block type. This is a bug in BlockNote.",
    );
  }

  validateRenderHooks(blockConfig, implementation);

  // The block's config is stored on its node's PM spec
  // (`NodeSpec.blockConfig`), so code holding a bare `Node` can consult it
  // without an editor or schema reference. (`extendNodeSchema` hooks run
  // for every node in the schema, hence the name gate.)
  const node = builtNode.extend({
    extendNodeSchema(extension) {
      return extension.name === builtNode.name ? { blockConfig } : {};
    },
  });

  // The spec holds the resolved settings, not the declared option.
  const { experimental_keyboard, render, toExternalHTML, ...rest } =
    implementation;
  return {
    config: blockConfig,
    implementation: {
      ...rest,
      keyboard: createBlockKeyboard(experimental_keyboard, {
        isLayoutBlock,
        hardBreakShortcut: implementation.meta.hardBreakShortcut,
      }),
      node,
      // The block's content outside the editor. A layout block has no content,
      // so no `render`: it is its frame. A frame is drawn by whoever
      // assembles the block (the serializers), never by `render`.
      ...(render && {
        render(block: any, editor: BlockNoteEditor<any, any, any>) {
          const blockContentDOMAttributes =
            node.options.domAttributes?.blockContent || {};

          return render.call(
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
      }),
      // The block's own external HTML, when it declares one. It replaces the
      // default export (`render` in its frame), which the external serializer
      // makes for a block without one.
      // TODO: this should not have wrapInBlockStructure and generally be a lot simpler
      // post-processing in externalHTMLExporter should not be necessary
      ...(toExternalHTML && {
        toExternalHTML: (
          block: any,
          editor: BlockNoteEditor<any, any, any>,
          context: { nestingLevel: number },
        ) => {
          const blockContentDOMAttributes =
            node.options.domAttributes?.blockContent || {};

          const external = toExternalHTML.call(
            { blockContentDOMAttributes, propSchema: blockConfig.propSchema },
            block as any,
            editor as any,
            context,
          );
          // A layout block's export carries its props as `data-*`, as a regular
          // block's does.
          if (external && isLayoutBlock && !isDocumentFragment(external.dom)) {
            applyDataAttributes(
              external.dom,
              block.props,
              blockConfig.propSchema,
            );
          }
          return external;
        },
      }),
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

    // Only a block declared `layoutOnly: true` is a layout block here. Every
    // other block keeps its ordinary shape.
    const isLayoutBlock = blockConfig.layoutOnly === true;

    // Reports a misdeclared block where it is created, including for JS
    // callers.
    validateRenderHooks(blockConfig, blockImplementation);
    const render = blockImplementation.render;
    const toExternalHTML = blockImplementation.toExternalHTML;

    return {
      config: blockConfig,
      implementation: {
        ...blockImplementation,
        // TODO: this should not have wrapInBlockStructure and generally be a lot simpler
        // post-processing in externalHTMLExporter should not be necessary
        // Only a block with its own export has `toExternalHTML`. Without
        // one, the external HTML serializer makes the default export.
        ...(toExternalHTML && {
          toExternalHTML(
            this: ThisParameterType<typeof toExternalHTML>,
            block: Parameters<typeof toExternalHTML>[0],
            editor: Parameters<typeof toExternalHTML>[1],
            context: Parameters<typeof toExternalHTML>[2],
          ) {
            const output = toExternalHTML.call(
              { blockContentDOMAttributes: this.blockContentDOMAttributes },
              block as any,
              editor as any,
              context,
            );

            if (output === undefined) {
              return undefined;
            }

            if (isLayoutBlock) {
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
        }),
        // A layout block has no `render`: it draws only its frame.
        ...(render && {
          render(
            this: ThisParameterType<typeof render>,
            block: Parameters<typeof render>[0],
            editor: Parameters<typeof render>[1],
          ) {
            const output = render.call(
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
        }),
      },
      extensions: extensions,
    };
  };
}
