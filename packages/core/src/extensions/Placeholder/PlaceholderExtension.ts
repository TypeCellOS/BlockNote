import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

const PLUGIN_KEY = new PluginKey(`blocknote-placeholder`);

/**
 * This is a modified version of the tiptap
 * placeholder plugin, that also sets hasAnchorClass
 *
 * It does not set a data-placeholder (text is currently done in css)
 *
 */
export interface PlaceholderOptions {
  placeholders: Record<string | "default", string>;
}

export const Placeholder = Extension.create<
  PlaceholderOptions,
  { styleEl: HTMLStyleElement }
>({
  name: "placeholder",

  addStorage() {
    return {
      styleEl: document.createElement("style"),
    };
  },

  addOptions() {
    return {
      placeholders: {
        default: "Enter text or type '/' for commands",
        heading: "Heading",
        bulletListItem: "List",
        numberedListItem: "List",
      },
    };
  },

  onCreate() {
    const styleEl = this.storage.styleEl;
    document.head.appendChild(styleEl);
    const styleSheet = styleEl.sheet!;

    const getBaseSelector = (additionalSelectors = "") =>
      `.bn-block-content${additionalSelectors} .bn-inline-content:has(> .ProseMirror-trailingBreak):before`;

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

    for (const [blockType, placeholder] of Object.entries(
      this.options.placeholders
    )) {
      const mustBeFocused = blockType === "default";

      styleSheet.insertRule(
        `${getSelector(blockType, mustBeFocused)}{ content: "${placeholder}"; }`
      );

      // For some reason, the placeholders which show when the block is focused
      // take priority over ones which show depending on block type, so we need
      // to make sure the block specific ones are also used when the block is
      // focused.
      if (!mustBeFocused) {
        styleSheet.insertRule(
          `${getSelector(blockType, true)}{ content: "${placeholder}"; }`
        );
      }
    }
  },

  onDestroy() {
    const styleEl = this.storage.styleEl;
    document.head.removeChild(styleEl);
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: PLUGIN_KEY,
        props: {
          // TODO: maybe also add placeholder for empty document ("e.g.: start writing..")
          decorations: (state) => {
            const { doc, selection } = state;

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
