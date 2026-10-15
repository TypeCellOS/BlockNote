import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

import {
  createExtension,
  ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import { BlockNoteEditorOptions } from "../../editor/BlockNoteEditor.js";

const PLUGIN_KEY = new PluginKey(`blocknote-placeholder`);

export const PlaceholderExtension = createExtension(
  ({
    editor,
    options,
  }: ExtensionOptions<
    Pick<BlockNoteEditorOptions<any, any, any>, "placeholders">
  >) => {
    const placeholders = options.placeholders;
    return {
      key: "placeholder",
      prosemirrorPlugins: [
        new Plugin({
          key: PLUGIN_KEY,
          props: {
            decorations: (state) => {
              if (!editor.isEditable) {
                return DecorationSet.empty;
              }

              const { doc, selection } = state;
              const decorations: Decoration[] = [];
              doc.descendants((node, pos) => {
                if (
                  !node.isTextblock ||
                  !node.type.isInGroup("blockContent") ||
                  node.content.size ||
                  node.type.spec.code
                ) {
                  return;
                }

                let placeholder = placeholders?.[node.type.name];
                if (doc.content.size === 6) {
                  placeholder = placeholders?.emptyDocument ?? placeholder;
                }
                if (selection.empty && selection.$anchor.parent === node) {
                  placeholder = placeholders?.default ?? placeholder;
                }
                if (!placeholder) {
                  return false;
                }

                const text = placeholder;
                decorations.push(
                  Decoration.widget(
                    pos + 1,
                    (view) => {
                      const span = view.dom.ownerDocument.createElement("span");
                      span.className = "bn-placeholder";
                      span.contentEditable = "false";
                      span.setAttribute("aria-hidden", "true");
                      span.textContent = text;
                      return span;
                    },
                    {
                      side: -1,
                      key: `placeholder-${text}`,
                      ignoreSelection: true,
                    },
                  ),
                );
                return false;
              });
              return DecorationSet.create(doc, decorations);
            },
          },
        }),
      ],
    } as const;
  },
);
