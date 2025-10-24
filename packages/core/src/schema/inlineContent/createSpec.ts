import { Node } from "@tiptap/core";

import { TagParseRule } from "@tiptap/pm/model";
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
  };

  /**
   * Parses an external HTML element into a inline content of this type when it returns the block props object, otherwise undefined
   */
  parse?: (el: HTMLElement) => Partial<Props<T["propSchema"]>> | undefined;

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

export function getInlineContentParseRules<C extends CustomInlineContentConfig>(
  config: C,
  customParseFunction?: CustomInlineContentImplementation<C, any>["parse"],
) {
  const rules: TagParseRule[] = [
    {
      tag: `[data-inline-content-type="${config.type}"]`,
      contentElement: (element) => {
        const htmlElement = element as HTMLElement;

        if (htmlElement.matches("[data-editable]")) {
          return htmlElement;
        }

        return htmlElement.querySelector("[data-editable]") || htmlElement;
      },
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
        const output = inlineContentImplementation.render(
          inlineContent,
          updateInlineContent,
          editor,
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
