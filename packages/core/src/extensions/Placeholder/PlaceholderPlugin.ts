import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor";

const PLUGIN_KEY = new PluginKey(`blocknote-placeholder`);

export const PlaceholderPlugin = (
  editor: BlockNoteEditor<any, any, any>,
  placeholders: Record<string | "default", string>
) => {
  return new Plugin({
    key: PLUGIN_KEY,
    view: () => {
      const styleEl = document.createElement("style");
      const nonce = editor._tiptapEditor.options.injectNonce;
      if (nonce) {
        styleEl.setAttribute("nonce", nonce);
      }
      if (editor._tiptapEditor.view.root instanceof ShadowRoot) {
        editor._tiptapEditor.view.root.append(styleEl);
      } else {
        editor._tiptapEditor.view.root.head.appendChild(styleEl);
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

        styleSheet.insertRule(
          `${getSelector(blockType, mustBeFocused)}{ content: ${JSON.stringify(
            placeholder
          )}; }`
        );

        // For some reason, the placeholders which show when the block is focused
        // take priority over ones which show depending on block type, so we need
        // to make sure the block specific ones are also used when the block is
        // focused.
        if (!mustBeFocused) {
          styleSheet.insertRule(
            `${getSelector(blockType, true)}{ content: ${JSON.stringify(
              placeholder
            )}; }`
          );
        }
      }

      return {
        destroy: () => {
          if (editor._tiptapEditor.view.root instanceof ShadowRoot) {
            editor._tiptapEditor.view.root.removeChild(styleEl);
          } else {
            editor._tiptapEditor.view.root.head.removeChild(styleEl);
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
};
