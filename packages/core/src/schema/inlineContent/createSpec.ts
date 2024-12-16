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

// TODO: support serialization

export type CustomInlineContentImplementation<
  T extends CustomInlineContentConfig,
  // B extends BlockSchema,
  // I extends InlineContentSchema,
  S extends StyleSchema
> = {
  render: (
    /**
     * The custom inline content to render
     */
    inlineContent: InlineContentFromConfig<T, S>,
    updateInlineContent: (
      update: PartialCustomInlineContentFromConfig<T, S>
    ) => void,
    /**
     * The BlockNote editor instance
     * This is typed generically. If you want an editor with your custom schema, you need to
     * cast it manually, e.g.: `const e = editor as BlockNoteEditor<typeof mySchema>;`
     */
    editor: BlockNoteEditor<any, any, S>
    // (note) if we want to fix the manual cast, we need to prevent circular references and separate block definition and render implementations
    // or allow manually passing <BSchema>, but that's not possible without passing the other generics because Typescript doesn't support partial inferred generics
  ) => {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
    // destroy?: () => void;
  };
};

export function getInlineContentParseRules(
  config: CustomInlineContentConfig
): TagParseRule[] {
  return [
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
}

export function createInlineContentSpec<
  T extends CustomInlineContentConfig,
  S extends StyleSchema
>(
  inlineContentConfig: T,
  inlineContentImplementation: CustomInlineContentImplementation<T, S>
): InlineContentSpec<T> {
  const node = Node.create({
    name: inlineContentConfig.type,
    inline: true,
    group: "inline",
    selectable: inlineContentConfig.content === "styled",
    atom: inlineContentConfig.content === "none",
    content: (inlineContentConfig.content === "styled"
      ? "inline*"
      : "") as T["content"] extends "styled" ? "inline*" : "",

    addAttributes() {
      return propsToAttributes(inlineContentConfig.propSchema);
    },

    addKeyboardShortcuts() {
      return addInlineContentKeyboardShortcuts(inlineContentConfig);
    },

    parseHTML() {
      return getInlineContentParseRules(inlineContentConfig);
    },

    renderHTML({ node }) {
      const editor = this.options.editor;

      const output = inlineContentImplementation.render(
        nodeToCustomInlineContent(
          node,
          editor.schema.inlineContentSchema,
          editor.schema.styleSchema
        ) as any as InlineContentFromConfig<T, S>, // TODO: fix cast
        () => {
          // No-op
        },
        editor
      );

      return addInlineContentAttributes(
        output,
        inlineContentConfig.type,
        node.attrs as Props<T["propSchema"]>,
        inlineContentConfig.propSchema
      );
    },

    addNodeView() {
      return ({ node, getPos }) => {
        const editor = this.options.editor;

        const output = inlineContentImplementation.render(
          nodeToCustomInlineContent(
            node,
            editor.schema.inlineContentSchema,
            editor.schema.styleSchema
          ) as any as InlineContentFromConfig<T, S>, // TODO: fix cast
          (update) => {
            if (typeof getPos === "boolean") {
              return;
            }

            const content = inlineContentToNodes(
              [update],
              editor._tiptapEditor.schema,
              editor.schema.styleSchema
            );

            editor.dispatch(
              editor.prosemirrorView.state.tr.replaceWith(
                getPos(),
                getPos() + node.nodeSize,
                content
              )
            );
          },
          editor
        );

        return addInlineContentAttributes(
          output,
          inlineContentConfig.type,
          node.attrs as Props<T["propSchema"]>,
          inlineContentConfig.propSchema
        );
      };
    },
  });

  return createInlineContentSpecFromTipTapNode(
    node,
    inlineContentConfig.propSchema
  ) as InlineContentSpec<T>; // TODO: fix cast
}
