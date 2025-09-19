import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { v4 } from "uuid";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { BlockNoteExtension } from "../../editor/BlockNoteExtension.js";

const PLUGIN_KEY = new PluginKey(`blocknote-placeholder`);

export class PlaceholderPlugin extends BlockNoteExtension {
  public static key() {
    return "placeholder";
  }

  constructor(
    editor: BlockNoteEditor<any, any, any>,
    placeholders: Record<
      string | "default" | "emptyDocument",
      string | undefined
    >,
  ) {
    super();
    this.addProsemirrorPlugin(
      new Plugin({
        key: PLUGIN_KEY,
        view: (view) => {
          const uniqueEditorSelector = `placeholder-selector-${v4()}`;
          view.dom.classList.add(uniqueEditorSelector);
          const styleEl = document.createElement("style");

          const nonce = editor._tiptapEditor.options.injectNonce;
          if (nonce) {
            styleEl.setAttribute("nonce", nonce);
          }

          if (view.root instanceof window.ShadowRoot) {
            view.root.append(styleEl);
          } else {
            view.root.head.appendChild(styleEl);
          }

          const styleSheet = styleEl.sheet!;

          const getSelector = (additionalSelectors = "") =>
            `.${uniqueEditorSelector} .bn-block-content${additionalSelectors} .bn-inline-content:has(> .ProseMirror-trailingBreak:only-child):before`;

          try {
            // FIXME: the names "default" and "emptyDocument" are hardcoded
            const {
              default: defaultPlaceholder,
              emptyDocument: emptyPlaceholder,
              ...rest
            } = placeholders;

            // add block specific placeholders
            for (const [blockType, placeholder] of Object.entries(rest)) {
              const blockTypeSelector = `[data-content-type="${blockType}"]`;

              styleSheet.insertRule(
                `${getSelector(blockTypeSelector)} { content: ${JSON.stringify(
                  placeholder,
                )}; }`,
              );
            }

            const onlyBlockSelector = `[data-is-only-empty-block]`;
            const mustBeFocusedSelector = `[data-is-empty-and-focused]`;

            // placeholder for when there's only one empty block
            styleSheet.insertRule(
              `${getSelector(onlyBlockSelector)} { content: ${JSON.stringify(
                emptyPlaceholder,
              )}; }`,
            );

            // placeholder for default blocks, only when the cursor is in the block (mustBeFocused)
            styleSheet.insertRule(
              `${getSelector(mustBeFocusedSelector)} { content: ${JSON.stringify(
                defaultPlaceholder,
              )}; }`,
            );
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn(
              `Failed to insert placeholder CSS rule - this is likely due to the browser not supporting certain CSS pseudo-element selectors (:has, :only-child:, or :before)`,
              e,
            );
          }

          return {
            destroy: () => {
              if (view.root instanceof window.ShadowRoot) {
                view.root.removeChild(styleEl);
              } else {
                view.root.head.removeChild(styleEl);
              }
            },
          };
        },
        props: {
          decorations: (state) => {
            const { doc, selection } = state;

            if (!editor.isEditable) {
              return;
            }

            if (!selection.empty) {
              return;
            }

            // Don't show placeholder when the cursor is inside a code block
            if (selection.$from.parent.type.spec.code) {
              return;
            }

            const decs = [];

            // decoration for when there's only one empty block
            // positions are hardcoded for now
            if (state.doc.content.size === 6) {
              decs.push(
                Decoration.node(2, 4, {
                  "data-is-only-empty-block": "true",
                }),
              );
            }

            const $pos = selection.$anchor;
            const node = $pos.parent;

            if (node.content.size === 0) {
              const before = $pos.before();

              decs.push(
                Decoration.node(before, before + node.nodeSize, {
                  "data-is-empty-and-focused": "true",
                }),
              );
            }

            return DecorationSet.create(doc, decs);
          },
        },
      }),
    );
  }
}
