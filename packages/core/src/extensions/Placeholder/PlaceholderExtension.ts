import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { slashMenuPluginKey } from "../SlashMenu/SlashMenuPlugin";
import { nodeToBlock } from "../../api/nodeConversions/nodeConversions";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { Block } from "../../schema";

const PLUGIN_KEY = new PluginKey(`blocknote-placeholder`);

/**
 * This is a modified version of the tiptap
 * placeholder plugin, that also sets hasAnchorClass
 *
 * It does not set a data-placeholder (text is currently done in css)
 *
 */
export interface PlaceholderOptions {
  editor: BlockNoteEditor<any, any, any> | undefined;
  placeholder: (
    block: Block<any, any, any>,
    containsCursor: boolean,
    isFilter: boolean
  ) => string | undefined;
}

export const Placeholder = Extension.create<PlaceholderOptions>({
  name: "placeholder",

  addOptions() {
    return {
      editor: undefined,
      placeholder: (block, containsCursor, isFilter) => {
        if (block.type === "heading") {
          return "Heading";
        }

        if (
          block.type === "bulletListItem" ||
          block.type === "numberedListItem"
        ) {
          return "List";
        }

        if (isFilter) {
          return "Filter blocks";
        }

        if (containsCursor) {
          return 'Type "/" for commands';
        }

        return undefined;
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: PLUGIN_KEY,
        props: {
          decorations: (state) => {
            const { doc, selection } = state;
            // Get state of slash menu
            const menuState = slashMenuPluginKey.getState(state);
            const active = this.editor.isEditable;
            const { anchor } = selection;
            const decorations: Decoration[] = [];

            if (!active) {
              return;
            }

            doc.descendants((node, pos) => {
              if (
                node.type.spec.group !== "blockContent" ||
                node.type.spec.content === ""
              ) {
                return true;
              }

              const isEmpty = !node.isLeaf && !node.childCount;

              if (isEmpty) {
                const blockContainer = state.doc.resolve(pos).node();
                const block = nodeToBlock(
                  blockContainer,
                  this.options.editor!.blockSchema,
                  this.options.editor!.inlineContentSchema,
                  this.options.editor!.styleSchema,
                  this.options.editor!.blockCache
                );

                const containsCursor =
                  anchor >= pos && anchor <= pos + node.nodeSize;
                const isFilter =
                  menuState?.triggerCharacter === "" && menuState?.active;

                const placeholder = this.options.placeholder(
                  block,
                  containsCursor,
                  isFilter
                );

                if (placeholder !== undefined) {
                  // Because we cannot set a decoration on the inline content
                  // element itself (it's only counted as a distinct node in the
                  // DOM, not in the PM schema), this is a hack to get the
                  // placeholder value inside CSS.
                  const decoration = Decoration.node(pos, pos + node.nodeSize, {
                    style: `--placeholder: '${placeholder}'`,
                    "data-placeholder": "",
                  });
                  decorations.push(decoration);
                }

                // using widget, didn't work (caret position bug)
                // const decoration = Decoration.widget(
                //   pos + 1,
                //   () => {
                //     const el = document.createElement("span");
                //     el.innerText = "hello";
                //     return el;
                //   },
                //   { side: 0 }

                return false;
              }

              return true;
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
