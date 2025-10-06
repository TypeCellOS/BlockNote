import { DOMSerializer, Schema } from "prosemirror-model";

import { PartialBlock } from "../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContent,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import {
  serializeBlocksExternalHTML,
  serializeInlineContentExternalHTML,
} from "./util/serializeBlocksExternalHTML.js";

// Used to export BlockNote blocks and ProseMirror nodes to HTML for use outside
// the editor. Blocks are exported using the `toExternalHTML` method in their
// `blockSpec`, or `toInternalHTML` if `toExternalHTML` is not defined.
//
// The HTML created by this serializer is different to what's rendered by the
// editor to the DOM. This also means that data is likely to be lost when
// converting back to original blocks. The differences in the output HTML are:
// 1. It doesn't include the `blockGroup` and `blockContainer` wrappers meaning
// that nesting is not preserved for non-list-item blocks.
// 2. `li` items in the output HTML are wrapped in `ul` or `ol` elements.
// 3. While nesting for list items is preserved, other types of blocks nested
// inside a list are un-nested and a new list is created after them.
// 4. The HTML is wrapped in a single `div` element.

// Needs to be sync because it's used in drag handler event (SideMenuPlugin)
export const createExternalHTMLExporter = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  schema: Schema,
  editor: BlockNoteEditor<BSchema, I, S>,
) => {
  const serializer = DOMSerializer.fromSchema(schema);

  return {
    exportBlocks: (
      blocks: PartialBlock<BSchema, I, S>[],
      options: { document?: Document },
    ) => {
      const html = serializeBlocksExternalHTML(
        editor,
        blocks,
        serializer,
        new Set<string>(["numberedListItem"]),
        new Set<string>(["bulletListItem", "checkListItem", "toggleListItem"]),
        options,
      );
      const div = document.createElement("div");
      div.append(html);
      return div.innerHTML;
    },

    exportInlineContent: (
      inlineContent: InlineContent<I, S>[],
      options: { document?: Document },
    ) => {
      const domFragment = serializeInlineContentExternalHTML(
        editor,
        inlineContent as any,
        serializer,
        options,
      );

      const parent = document.createElement("div");
      parent.append(domFragment.cloneNode(true));

      return parent.innerHTML;
    },
  };
};
