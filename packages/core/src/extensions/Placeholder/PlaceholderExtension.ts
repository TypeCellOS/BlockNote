import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";
import { Block } from "../../schema";
import { slashMenuPluginKey } from "../SlashMenu/SlashMenuPlugin";

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
          return "Type to filter";
        }

        if (containsCursor) {
          return 'Enter text or type "/" for commands';
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
          // TODO: maybe also add placeholder for empty document ("e.g.: start writing..")
          decorations: (state) => {
            const { doc, selection } = state;

            // TODO: fix slash menu ("type to filter")
            const menuState = slashMenuPluginKey.getState(state);

            const active = this.editor.isEditable;

            if (!active) {
              return;
            }

            if (!selection.empty) {
              return;
            }

            const $pos = selection.$anchor;
            const node = $pos.parent;

            if (node.content.size > 0) {
              return null;
            }

            const before = $pos.before();

            const dec = Decoration.node(before, before + node.nodeSize, {
              "data-is-empty-and-focused": "true",
            });

            return DecorationSet.create(doc, [dec]);
          },
        },
      }),
    ];
  },
});
