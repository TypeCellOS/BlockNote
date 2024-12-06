import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

const PLUGIN_KEY = new PluginKey(`blocknote-placeholder`);

export class PlaceholderPlugin {
  public readonly plugin: Plugin;
  constructor(
    editor: BlockNoteEditor<any, any, any>,
    placeholders: Record<string | "default", string>
  ) {
    this.plugin = new Plugin({
      key: PLUGIN_KEY,
      view: () => {
        const styleEl = document.createElement("style");
        const nonce = editor._tiptapEditor.options.injectNonce;
        if (nonce) {
          styleEl.setAttribute("nonce", nonce);
        }
        if (editor.prosemirrorView?.root instanceof ShadowRoot) {
          editor.prosemirrorView.root.append(styleEl);
        } else {
          editor.prosemirrorView?.root.head.appendChild(styleEl);
        }

        const styleSheet = styleEl.sheet!;

        const getBaseSelector = (additionalSelectors = "") =>
          `.bn-block-content${additionalSelectors} .bn-inline-content:has(> .ProseMirror-trailingBreak:only-child):before`;

        const getSelector = (
          blockType: string | "default",
          mustBeFocused = true
        ) => {
          const mustBeFocusedSelector = mustBeFocused
            ? `[data-is-empty-and-focused]`
            : ``;

          if (blockType === "default") {
            return getBaseSelector(mustBeFocusedSelector);
          }

          const blockTypeSelector = `[data-content-type="${blockType}"]`;
          return getBaseSelector(mustBeFocusedSelector + blockTypeSelector);
        };

        for (const [blockType, placeholder] of Object.entries(placeholders)) {
          const mustBeFocused = blockType === "default";

          try {
            styleSheet.insertRule(
              `${getSelector(
                blockType,
                mustBeFocused
              )} { content: ${JSON.stringify(placeholder)}; }`
            );

            // For some reason, the placeholders which show when the block is focused
            // take priority over ones which show depending on block type, so we need
            // to make sure the block specific ones are also used when the block is
            // focused.
            if (!mustBeFocused) {
              styleSheet.insertRule(
                `${getSelector(blockType, true)} { content: ${JSON.stringify(
                  placeholder
                )}; }`
              );
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn(
              `Failed to insert placeholder CSS rule - this is likely due to the browser not supporting certain CSS pseudo-element selectors (:has, :only-child:, or :before)`,
              e
            );
          }
        }

        return {
          destroy: () => {
            if (editor.prosemirrorView?.root instanceof ShadowRoot) {
              editor.prosemirrorView.root.removeChild(styleEl);
            } else {
              editor.prosemirrorView?.root.head.removeChild(styleEl);
            }
          },
        };
      },
      props: {
        // TODO: maybe also add placeholder for empty document ("e.g.: start writing..")
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
    });
  }
}
