import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { v4 } from "uuid";
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
          view: (view) => {
            view.dom.setAttribute(
              "data-selection-empty",
              view.state.selection.empty ? "true" : "false",
            );

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

            const createPlaceholderRule = (
              placeholder: string | undefined,
              additionalEditorSelectors = "",
              additionalBlockSelectors = "",
            ) => {
              // Creates CSS rule to set placeholder content at the given selector.
              styleSheet.insertRule(
                `.${uniqueEditorSelector}${additionalEditorSelectors} .bn-block-content${additionalBlockSelectors} .bn-inline-content:has(> .ProseMirror-trailingBreak:only-child):after { content: ${JSON.stringify(placeholder)}; }`,
              );
              // Creates CSS rule to hide the trailing break node while the
              // placeholder is visible. This is because it's rendered as a
              // `br` element, forcing the placeholder onto the next line.
              styleSheet.insertRule(
                `.${uniqueEditorSelector}${additionalEditorSelectors} .bn-block-content${additionalBlockSelectors} .bn-inline-content > .ProseMirror-trailingBreak:only-child { display: none; }`,
              );
            };
            try {
              // FIXME: the names "default" and "emptyDocument" are hardcoded
              const {
                default: defaultPlaceholder,
                emptyDocument: emptyPlaceholder,
                ...rest
              } = placeholders || {};

              // add block specific placeholders
              for (const [blockType, placeholder] of Object.entries(rest)) {
                createPlaceholderRule(
                  placeholder,
                  "[data-selection-empty='true']",
                  `[data-content-type="${blockType}"]`,
                );
                createPlaceholderRule(
                  placeholder,
                  "[data-selection-empty='false']",
                  `[data-content-type="${blockType}"]:not([data-is-empty-and-focused])`,
                );
              }

              // placeholder for when there's only one empty block
              createPlaceholderRule(
                emptyPlaceholder,
                "[data-selection-empty='true']",
                "[data-is-only-empty-block]",
              );

              // placeholder for default blocks, only when the cursor is in the block (mustBeFocused)
              createPlaceholderRule(
                defaultPlaceholder,
                "[data-selection-empty='true']",
                "[data-is-empty-and-focused]",
              );
            } catch (e) {
              // eslint-disable-next-line no-console
              console.warn(
                `Failed to insert placeholder CSS rule - this is likely due to the browser not supporting certain CSS pseudo-element selectors (:has, :only-child:, or :before)`,
                e,
              );
            }

            return {
              update: (view) => {
                view.dom.setAttribute(
                  "data-selection-empty",
                  view.state.selection.empty ? "true" : "false",
                );
              },
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
      ],
    } as const;
  },
);
