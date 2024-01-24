import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
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
  placeholder: Record<
    string | "default" | "addBlock",
    | string
    | {
        placeholder: string;
        mustBeFocused: boolean;
      }
  >;
}

export const Placeholder = Extension.create<PlaceholderOptions>({
  name: "placeholder",

  addOptions() {
    return {
      placeholder: {
        default: "Enter text or type '/' for commands",
        addBlock: "Type to filter",
        heading: {
          placeholder: "Heading",
          mustBeFocused: false,
        },
        bulletListItem: {
          placeholder: "List",
          mustBeFocused: false,
        },
        numberedListItem: {
          placeholder: "List",
          mustBeFocused: false,
        },
      },
    };
  },

  addProseMirrorPlugins() {
    const styleEl = document.createElement("style");

    // Append <style> element to <head>
    document.head.appendChild(styleEl);

    // Grab style element's sheet
    const styleSheet = styleEl.sheet!;

    const getBaseSelector = (additionalSelectors = "") =>
      `.bn-block-content${additionalSelectors} .bn-inline-content:has(> .ProseMirror-trailingBreak):before`;

    const getSelector = (
      blockType: string | "default" | "addBlock",
      mustBeFocused = true
    ) => {
      const mustBeFocusedSelector = mustBeFocused
        ? `[data-is-empty-and-focused]`
        : ``;

      if (blockType === "default") {
        return getBaseSelector(mustBeFocusedSelector);
      }

      if (blockType === "addBlock") {
        const addBlockSelector = "[data-is-filter]";
        return getBaseSelector(addBlockSelector);
      }

      const blockTypeSelector = `[data-content-type="${blockType}"]`;
      return getBaseSelector(mustBeFocusedSelector + blockTypeSelector);
    };

    for (const [blockType, placeholderRule] of Object.entries(
      this.options.placeholder
    )) {
      const placeholder =
        typeof placeholderRule === "string"
          ? placeholderRule
          : placeholderRule.placeholder;
      const mustBeFocused =
        typeof placeholderRule === "string"
          ? true
          : placeholderRule.mustBeFocused;

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

    return [
      new Plugin({
        key: PLUGIN_KEY,
        props: {
          // TODO: maybe also add placeholder for empty document ("e.g.: start writing..")
          decorations: (state) => {
            const { doc, selection } = state;

            // TODO: fix slash menu ("type to filter")
            const menuState = slashMenuPluginKey.getState(state);
            const isFilter =
              menuState?.triggerCharacter === "" && menuState?.active;

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

            const attr = isFilter
              ? "data-is-filter"
              : "data-is-empty-and-focused";
            const dec = Decoration.node(before, before + node.nodeSize, {
              [attr]: "true",
            });

            return DecorationSet.create(doc, [dec]);
          },
        },
      }),
    ];
  },
});
