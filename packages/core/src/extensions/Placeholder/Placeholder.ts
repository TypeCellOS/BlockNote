import type { Node } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

import {
  createExtension,
  ExtensionOptions,
} from "../../editor/BlockNoteExtension.js";
import { BlockNoteEditorOptions } from "../../editor/BlockNoteEditor.js";

const PLUGIN_KEY = new PluginKey(`blocknote-placeholder`);

// Renders static placeholders for empty blocks and a selection placeholder
// for the block containing the cursor, caching both across state updates.
export const PlaceholderExtension = createExtension(
  ({
    editor,
    options,
  }: ExtensionOptions<
    Pick<BlockNoteEditorOptions<any, any, any>, "placeholders">
  >) => {
    const placeholders = options.placeholders;
    // Static placeholders depend only on the document; selection placeholders
    // override them at the cursor. The cached static set stays intact.
    let cache:
      | {
          doc: Node;
          staticPlaceholders: DecorationSet;
          selectionPlaceholderPosition: number | undefined;
          finalPlaceholders: DecorationSet;
        }
      | undefined;

    // Checks whether a node is an empty, non-code block that accepts placeholder text.
    function canShowPlaceholder(node: Node) {
      return (
        node.isTextblock &&
        node.type.isInGroup("blockContent") &&
        node.content.size === 0 &&
        !node.type.spec.code
      );
    }

    // Creates placeholder decorations for blocks like headings/list items which are shown
    // regardless of selection position.
    function createStaticPlaceholders(doc: Node) {
      const decorations: Decoration[] = [];
      doc.descendants((node, pos) => {
        if (!node.isTextblock) {
          return;
        }
        if (canShowPlaceholder(node)) {
          let text = placeholders?.[node.type.name];
          // A document containing one empty block has this fixed node size.
          if (doc.content.size === 6) {
            text = placeholders?.emptyDocument ?? text;
          }
          if (text) {
            decorations.push(createPlaceholderWidget(pos + 1, text));
          }
        }
        // Inline children cannot contain another block placeholder.
        return false;
      });
      return DecorationSet.create(doc, decorations);
    }

    // Creates a widget that lazily renders a non-editable placeholder span at the given position.
    function createPlaceholderWidget(pos: number, text: string) {
      return Decoration.widget(
        pos,
        (view) => {
          const span = view.dom.ownerDocument.createElement("span");
          span.className = "bn-placeholder";
          span.contentEditable = "false";
          span.setAttribute("aria-hidden", "true");
          span.textContent = text;
          return span;
        },
        { side: -1, key: `placeholder-${text}`, ignoreSelection: true },
      );
    }

    return {
      key: "placeholder",
      prosemirrorPlugins: [
        new Plugin({
          key: PLUGIN_KEY,
          props: {
            // Reuses static placeholders and applies the selection placeholder for this state.
            decorations: (state) => {
              if (!editor.isEditable) {
                return DecorationSet.empty;
              }

              const { doc, selection } = state;
              const selectionPlaceholderPosition =
                selection.empty && canShowPlaceholder(selection.$anchor.parent)
                  ? selection.$anchor.start()
                  : undefined;

              // ProseMirror documents are immutable. The same document and
              // selection placeholder position produce the same decorations, even in a new state.
              if (
                cache?.doc === doc &&
                cache.selectionPlaceholderPosition ===
                  selectionPlaceholderPosition
              ) {
                return cache.finalPlaceholders;
              }

              // Only document edits require a traversal. Cursor moves reuse the
              // static placeholders and update the selection placeholder.
              const staticPlaceholders =
                cache?.doc === doc
                  ? cache.staticPlaceholders
                  : createStaticPlaceholders(doc);
              let finalPlaceholders = staticPlaceholders;
              const selectionPlaceholderText = placeholders?.default;
              if (
                selectionPlaceholderPosition !== undefined &&
                selectionPlaceholderText != null
              ) {
                finalPlaceholders = staticPlaceholders.remove(
                  staticPlaceholders.find(
                    selectionPlaceholderPosition,
                    selectionPlaceholderPosition,
                  ),
                );
                // Empty selection text hides the static placeholder at the cursor.
                if (selectionPlaceholderText) {
                  finalPlaceholders = finalPlaceholders.add(doc, [
                    createPlaceholderWidget(
                      selectionPlaceholderPosition,
                      selectionPlaceholderText,
                    ),
                  ]);
                }
              }

              cache = {
                doc,
                staticPlaceholders,
                selectionPlaceholderPosition,
                finalPlaceholders,
              };
              return finalPlaceholders;
            },
          },
        }),
      ],
    } as const;
  },
);
