import { Schema } from "prosemirror-model";

import { Block } from "../../../blocks/defaultBlocks.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import { HTMLToBlocks } from "../html/parseHTML.js";
import { markdownToHtml } from "./markdownToHtml.js";

export function markdownToHTML(markdown: string): string {
  return markdownToHtml(markdown);
}

export function markdownToBlocks<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(markdown: string, pmSchema: Schema): Block<BSchema, I, S>[] {
  const htmlString = markdownToHTML(markdown);

  return HTMLToBlocks(htmlString, pmSchema);
}
