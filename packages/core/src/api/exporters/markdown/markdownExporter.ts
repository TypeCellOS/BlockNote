import { Schema } from "prosemirror-model";

import { PartialBlock } from "../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import { createExternalHTMLExporter } from "../html/externalHTMLExporter.js";
import { htmlToMarkdown } from "./htmlToMarkdown.js";

// Needs to be sync because it's used in drag handler event (SideMenuPlugin)
export function cleanHTMLToMarkdown(cleanHTMLString: string) {
  return htmlToMarkdown(cleanHTMLString);
}

export function blocksToMarkdown<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  blocks: PartialBlock<BSchema, I, S>[],
  schema: Schema,
  editor: BlockNoteEditor<BSchema, I, S>,
  options: { document?: Document },
): string {
  const exporter = createExternalHTMLExporter(schema, editor);
  const externalHTML = exporter.exportBlocks(blocks, options);

  return cleanHTMLToMarkdown(externalHTML);
}
