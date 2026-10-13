import type { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { editorHasBlockWithType } from "./defaultBlockTypeGuards.js";

const HEADING_KEYS = {
  1: "heading",
  2: "heading_2",
  3: "heading_3",
  4: "heading_4",
  5: "heading_5",
  6: "heading_6",
} as const;

const TOGGLE_HEADING_KEYS = {
  1: "toggle_heading",
  2: "toggle_heading_2",
  3: "toggle_heading_3",
} as const;

/**
 * A block type that the default menus (the slash menu and the block type
 * select) offer, with the props that choosing it sets.
 */
export type DefaultBlockTypeItem = {
  /** The item's key in `dictionary.slash_menu`, which both menus share. */
  key:
    | (typeof HEADING_KEYS)[keyof typeof HEADING_KEYS]
    | (typeof TOGGLE_HEADING_KEYS)[keyof typeof TOGGLE_HEADING_KEYS]
    | "paragraph"
    | "quote"
    | "toggle_list"
    | "bullet_list"
    | "numbered_list"
    | "check_list";
  type: string;
  props?: Record<string, boolean | number | string>;
};

/**
 * The block types that the editor's schema supports, out of the ones that the
 * default menus offer: paragraph, headings, toggle headings, quote and lists.
 * Each menu places them in its own order, by key; this list has the block type
 * select's order.
 *
 * Headings are offered for the heading's configured `levels` (BLO-990).
 * Toggle headings are offered only when the heading has `isToggleable`, and a
 * regular heading then sets `isToggleable: false`, so that choosing it turns a
 * toggle heading into a regular one (BLO-959, BLO-1236).
 */
export function getDefaultBlockTypeItems(
  editor: BlockNoteEditor<any, any, any>,
): DefaultBlockTypeItem[] {
  const items: DefaultBlockTypeItem[] = [];

  if (editorHasBlockWithType(editor, "paragraph")) {
    items.push({ key: "paragraph", type: "paragraph" });
  }

  if (editorHasBlockWithType(editor, "heading", { level: "number" })) {
    const levels = editor.schema.blockSchema.heading.propSchema.level.values;
    const hasToggles = editorHasBlockWithType(editor, "heading", {
      level: "number",
      isToggleable: "boolean",
    });
    for (const level of [1, 2, 3, 4, 5, 6] as const) {
      if (levels?.includes(level)) {
        items.push({
          key: HEADING_KEYS[level],
          type: "heading",
          props: hasToggles ? { level, isToggleable: false } : { level },
        });
      }
    }
    if (hasToggles) {
      for (const level of [1, 2, 3] as const) {
        if (levels?.includes(level)) {
          items.push({
            key: TOGGLE_HEADING_KEYS[level],
            type: "heading",
            props: { level, isToggleable: true },
          });
        }
      }
    }
  }

  for (const [key, type] of [
    ["quote", "quote"],
    ["toggle_list", "toggleListItem"],
    ["bullet_list", "bulletListItem"],
    ["numbered_list", "numberedListItem"],
    ["check_list", "checkListItem"],
  ] as const) {
    if (editorHasBlockWithType(editor, type)) {
      items.push({ key, type });
    }
  }

  return items;
}
