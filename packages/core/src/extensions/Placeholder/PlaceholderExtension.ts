import { Editor, Extension } from "@tiptap/core";
import { Node as ProsemirrorNode } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { SlashMenuPluginKey } from "../SlashMenu/SlashMenuExtension";
import i18next from "./localisation";

const PLUGIN_KEY = new PluginKey("blocknote-placeholder");

/**
 * This is a modified version of the tiptap
 * placeholder plugin, that also sets hasAnchorClass
 *
 * It does not set a data-placeholder (text is currently done in css)
 *
 */
export interface PlaceholderOptions {
  emptyEditorClass: string;
  emptyNodeClass: string;
  isFilterClass: string;
  hasAnchorClass: string;
  placeholder:
    | ((PlaceholderProps: {
        editor: Editor;
        node: ProsemirrorNode;
        pos: number;
        hasAnchor: boolean;
      }) => string)
    | string;
  showOnlyWhenEditable: boolean;
  showOnlyCurrent: boolean;
  includeChildren: boolean;
}

export const Placeholder = Extension.create<PlaceholderOptions>({
  name: "placeholder",
  addOptions() {
    return {
      emptyEditorClass: "is-editor-empty",
      emptyNodeClass: "is-empty",
      isFilterClass: "is-filter",
      hasAnchorClass: "has-anchor",
      placeholder:
        i18next.t("placeholder") || "Enter text or type '/' for commands",
      showOnlyWhenEditable: true,
      showOnlyCurrent: true,
      includeChildren: false,
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
            const menuState = SlashMenuPluginKey.getState(state);
            const active =
              this.editor.isEditable || !this.options.showOnlyWhenEditable;
            const { anchor } = selection;
            const decorations: Decoration[] = [];

            if (!active) {
              return;
            }

            doc.descendants((node, pos) => {
              const hasAnchor = anchor >= pos && anchor <= pos + node.nodeSize;
              const isEmpty = !node.isLeaf && !node.childCount;

              if ((hasAnchor || !this.options.showOnlyCurrent) && isEmpty) {
                const classes = [this.options.emptyNodeClass];

                if (this.editor.isEmpty) {
                  classes.push(this.options.emptyEditorClass);
                }

                if (hasAnchor) {
                  classes.push(this.options.hasAnchorClass);
                }

                // If slash menu is of drag type and active, show the filter placeholder
                if (menuState?.triggerCharacter === "" && menuState?.active) {
                  classes.push(this.options.isFilterClass);
                }

                const pph =
                  typeof this.options.placeholder === "function"
                    ? this.options.placeholder({
                        editor: this.editor,
                        node,
                        pos,
                        hasAnchor,
                      })
                    : this.options.placeholder;
                const typePh: Record<string, string> = {
                  paragraph: pph,
                  heading: i18next.t("heading"),
                  numberedListItem: i18next.t("list"),
                  bulletListItem: i18next.t("list"),
                };
                const ph = typePh[node.type.name] || "";
                const decoration = Decoration.node(pos, pos + node.nodeSize, {
                  class: classes.join(" "),
                  style: `--placeholder:'${ph.replaceAll("'", "\\'")}';`,
                });

                decorations.push(decoration);
              }

              return this.options.includeChildren;
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
