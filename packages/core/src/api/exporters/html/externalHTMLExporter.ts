import { DOMSerializer, Schema } from "prosemirror-model";

import { PartialBlock } from "../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContent,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import { esmDependencies } from "../../../util/esmDependencies.js";
import {
  serializeBlocks,
  serializeInlineContent,
} from "./util/sharedHTMLConversion.js";
import { simplifyBlocks } from "./util/simplifyBlocksRehypePlugin.js";

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
// Ideally, call `await initializeESMDependencies()` before calling this function
export const createExternalHTMLExporter = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  schema: Schema,
  editor: BlockNoteEditor<BSchema, I, S>
) => {
  const deps = esmDependencies;

  if (!deps) {
    throw new Error(
      "External HTML exporter requires ESM dependencies to be initialized"
    );
  }

  const serializer = DOMSerializer.fromSchema(schema);

  return {
    exportBlocks: (
      blocks: PartialBlock<BSchema, I, S>[],
      options: { document?: Document }
    ) => {
      const html = serializeBlocks(
        editor,
        blocks,
        serializer,
        true,
        options
      ).outerHTML;

      // Possible improvement: now, we first use the serializeBlocks function
      // which adds blockcontainer and blockgroup wrappers. We then pass the
      // result to simplifyBlocks, which then cleans the wrappers.
      //
      // It might be easier if we create a version of serializeBlocks that
      // doesn't add the wrappers in the first place, then we can get rid of
      // the more complex simplifyBlocks plugin.
      let externalHTML: any = deps.unified
        .unified()
        .use(deps.rehypeParse.default, { fragment: true });
      if ((options as any).simplifyBlocks !== false) {
        externalHTML = externalHTML.use(simplifyBlocks, {
          orderedListItemBlockTypes: new Set<string>(["numberedListItem"]),
          unorderedListItemBlockTypes: new Set<string>([
            "bulletListItem",
            "checkListItem",
          ]),
        });
      }
      externalHTML = externalHTML
        .use(deps.rehypeStringify.default)
        .processSync(html);

      return externalHTML.value as string;
    },

    exportInlineContent: (
      inlineContent: InlineContent<I, S>[],
      options: { simplifyBlocks: boolean; document?: Document }
    ) => {
      const domFragment = serializeInlineContent(
        editor,
        inlineContent as any,
        serializer,
        true,
        options
      );

      const parent = document.createElement("div");
      parent.append(domFragment.cloneNode(true));

      return parent.innerHTML;
    },
  };
};
