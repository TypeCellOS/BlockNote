import { Node } from "@tiptap/core";

import {
  DOMParser,
  Fragment,
  Node as ProsemirrorNode,
  Schema,
  TagParseRule,
} from "@tiptap/pm/model";
import { inlineContentToNodes } from "../../api/nodeConversions/blockToNode.js";
import { nodeToCustomInlineContent } from "../../api/nodeConversions/nodeToBlock.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { propsToAttributes } from "../blocks/internal.js";
import { Props } from "../propTypes.js";
import { StyleSchema } from "../styles/types.js";
import {
  addInlineContentAttributes,
  addInlineContentKeyboardShortcuts,
  createInlineContentSpecFromTipTapNode,
} from "./internal.js";
import {
  CustomInlineContentConfig,
  InlineContentFromConfig,
  InlineContentSpec,
  PartialCustomInlineContentFromConfig,
} from "./types.js";

export type CustomInlineContentImplementation<
  T extends CustomInlineContentConfig,
  S extends StyleSchema,
> = {
  meta?: {
    draggable?: boolean;
    code?: boolean;
    /**
     * When {@link code} is `true`, this can syntax highlight the contents of the
     * inline content with the result of this callback.
     */
    // Method syntax (rather than an arrow-function property) so its parameter is
    // checked bivariantly, keeping a specific implementation assignable to the
    // generic spec record type.
    highlight?(
      inlineContent: Pick<InlineContentFromConfig<T, S>, "type" | "props">,
    ): string | undefined;
    /**
     * Marks the inline content as rendering a preview with an editable source
     * popup, driven by the editor-wide
     * `SourceInlineContentWithPreviewExtension`.
     */
    hasPreview?: boolean;
  };

  /**
   * Parses an external HTML element into a inline content of this type when it returns the block props object, otherwise undefined
   */
  parse?: (el: HTMLElement) => Partial<Props<T["propSchema"]>> | undefined;

  /**
   * Advanced parsing function that controls how the content within the inline
   * content is parsed. This is not recommended to use, and is only useful for
   * advanced use cases. Only applies to inline content with `content: "styled"`.
   * Return `undefined` to fall through to the default inline content parsing.
   */
  parseContent?: (options: {
    el: HTMLElement;
    schema: Schema;
  }) => Fragment | undefined;

  /**
   * Renders an inline content to DOM elements
   */
  render: (
    /**
     * The custom inline content to render
     */
    inlineContent: InlineContentFromConfig<T, S>,
    /**
     * A callback that allows overriding the inline content element
     */
    updateInlineContent: (
      update: PartialCustomInlineContentFromConfig<T, S>,
    ) => void,
    /**
     * The BlockNote editor instance
     * This is typed generically. If you want an editor with your custom schema, you need to
     * cast it manually, e.g.: `const e = editor as BlockNoteEditor<typeof mySchema>;`
     */
    editor: BlockNoteEditor<any, any, S>,
    // (note) if we want to fix the manual cast, we need to prevent circular references and separate block definition and render implementations
    // or allow manually passing <BSchema>, but that's not possible without passing the other generics because Typescript doesn't support partial inferred generics
    /**
     * The ProseMirror node backing this inline content.
     */
    node: ProsemirrorNode,
    /**
     * Returns this inline content's position in the document. When rendered
     * outside the editor (i.e. serialized to HTML), this is a no-op that returns
     * `undefined`.
     */
    getPos: () => number | undefined,
  ) => {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
    destroy?: () => void;
  };

  /**
   * Renders an inline content to external HTML elements for use outside the editor
   * If not provided, falls back to the render method
   */
  toExternalHTML?: (
    /**
     * The custom inline content to render
     */
    inlineContent: InlineContentFromConfig<T, S>,
    /**
     * The BlockNote editor instance
     * This is typed generically. If you want an editor with your custom schema, you need to
     * cast it manually, e.g.: `const e = editor as BlockNoteEditor<typeof mySchema>;`
     */
    editor: BlockNoteEditor<any, any, S>,
  ) =>
    | {
        dom: HTMLElement | DocumentFragment;
        contentDOM?: HTMLElement;
      }
    | undefined;

  runsBefore?: string[];
};

// Resolves the element whose children hold the inline content's editable
// content, i.e. the `[data-editable]` element (or the element itself if it is /
// contains none).
function getEditableElement(element: HTMLElement) {
  if (element.matches("[data-editable]")) {
    return element;
  }

  return element.querySelector<HTMLElement>("[data-editable]") || element;
}

// Parses an element's children as inline content.
function parseInlineContent(el: HTMLElement, schema: Schema) {
  return DOMParser.fromSchema(schema).parse(el, {
    topNode: schema.nodes.paragraph.create(),
    preserveWhitespace: true,
  }).content;
}

export function getInlineContentParseRules<C extends CustomInlineContentConfig>(
  config: C,
  customParseFunction?: CustomInlineContentImplementation<C, any>["parse"],
  customParseContentFunction?: CustomInlineContentImplementation<
    C,
    any
  >["parseContent"],
) {
  // When a custom `parseContent` function is provided (and this inline content
  // actually holds content), it controls how content within the inline content
  // is parsed. This applies to _both_ parse rules below, as content copied from
  // within the editor is tagged with `data-inline-content-type` (matched by the
  // first rule), while content pasted from outside is matched by the custom
  // `parse` function (the second rule). `resolveContentElement` locates the
  // element whose children to parse as a fallback when `parseContent` returns
  // `undefined`.
  const getContent =
    customParseContentFunction && config.content === "styled"
      ? (resolveContentElement: (el: HTMLElement) => HTMLElement) =>
          (node: HTMLElement, schema: Schema) => {
            const result = customParseContentFunction({ el: node, schema });

            // `parseContent` may return `undefined` to fall through to the
            // default inline content parsing.
            if (result !== undefined) {
              return result;
            }

            return parseInlineContent(resolveContentElement(node), schema);
          }
      : undefined;

  const rules: TagParseRule[] = [
    {
      tag: `[data-inline-content-type="${config.type}"]`,
      contentElement: (element) => getEditableElement(element as HTMLElement),
      getContent: getContent
        ? (node, schema) =>
            getContent(getEditableElement)(node as HTMLElement, schema)
        : undefined,
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
      // Because we do the parsing ourselves, we want to preserve whitespace for
      // content we've parsed.
      preserveWhitespace: getContent ? true : undefined,
      getContent: getContent
        ? (node, schema) => getContent((el) => el)(node as HTMLElement, schema)
        : undefined,
    });
  }
  return rules;
}

export function createInlineContentSpec<
  T extends CustomInlineContentConfig,
  S extends StyleSchema,
>(
  inlineContentConfig: T,
  inlineContentImplementation: CustomInlineContentImplementation<T, S>,
): InlineContentSpec<T> {
  const node = Node.create({
    name: inlineContentConfig.type,
    inline: true,
    group: "inline",
    draggable: inlineContentImplementation.meta?.draggable,
    selectable: inlineContentConfig.content === "styled",
    atom: inlineContentConfig.content === "none",
    code: inlineContentImplementation.meta?.code,
    content: inlineContentConfig.content === "styled" ? "inline*" : "",

    addAttributes() {
      return propsToAttributes(inlineContentConfig.propSchema);
    },

    addKeyboardShortcuts() {
      return addInlineContentKeyboardShortcuts(inlineContentConfig);
    },

    parseHTML() {
      return getInlineContentParseRules(
        inlineContentConfig,
        inlineContentImplementation.parse,
        inlineContentImplementation.parseContent,
      );
    },

    renderHTML({ node }) {
      const editor = this.options.editor;

      const output = inlineContentImplementation.render.call(
        { renderType: "dom", props: undefined },
        nodeToCustomInlineContent(
          node,
          editor.schema.inlineContentSchema,
          editor.schema.styleSchema,
        ) as any as InlineContentFromConfig<T, S>, // TODO: fix cast
        () => {
          // No-op
        },
        editor,
        node,
        () => undefined,
      );

      return addInlineContentAttributes(
        output,
        inlineContentConfig.type,
        node.attrs as Props<T["propSchema"]>,
        inlineContentConfig.propSchema,
      );
    },

    addNodeView() {
      return (props) => {
        const { node, getPos } = props;
        const editor = this.options.editor as BlockNoteEditor<any, any, S>;

        const output = inlineContentImplementation.render.call(
          { renderType: "nodeView", props },
          nodeToCustomInlineContent(
            node,
            editor.schema.inlineContentSchema,
            editor.schema.styleSchema,
          ) as any as InlineContentFromConfig<T, S>, // TODO: fix cast
          (update) => {
            const content = inlineContentToNodes([update], editor.pmSchema);

            const pos = getPos();

            if (!pos) {
              return;
            }

            editor.transact((tr) =>
              tr.replaceWith(pos, pos + node.nodeSize, content),
            );
          },
          editor,
          node,
          getPos,
        );

        return addInlineContentAttributes(
          output,
          inlineContentConfig.type,
          node.attrs as Props<T["propSchema"]>,
          inlineContentConfig.propSchema,
        );
      };
    },
  });

  return createInlineContentSpecFromTipTapNode(
    node,
    inlineContentConfig.propSchema,
    {
      ...inlineContentImplementation,
      toExternalHTML: inlineContentImplementation.toExternalHTML,
      render(inlineContent, updateInlineContent, editor) {
        // Rendered outside the editor (serialization), so there's no live node
        // view - derive the node from the content and stub out `getPos`.
        const node = inlineContentToNodes(
          [inlineContent] as any,
          editor.pmSchema,
        )[0];

        const output = inlineContentImplementation.render(
          inlineContent,
          updateInlineContent,
          editor,
          node,
          () => undefined,
        );

        return addInlineContentAttributes(
          output,
          inlineContentConfig.type,
          inlineContent.props,
          inlineContentConfig.propSchema,
        );
      },
    },
  ) as InlineContentSpec<T>;
}
