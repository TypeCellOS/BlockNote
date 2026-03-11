import { Schema } from "prosemirror-model";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

import { PartialBlock } from "../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import { createExternalHTMLExporter } from "../html/externalHTMLExporter.js";
import { removeUnderlines } from "./util/removeUnderlinesRehypePlugin.js";
import { addSpacesToCheckboxes } from "./util/addSpacesToCheckboxesRehypePlugin.js";
import { convertVideoToMarkdown } from "./util/convertVideoToMarkdownRehypePlugin.js";

// Needs to be sync because it's used in drag handler event (SideMenuPlugin)
export function cleanHTMLToMarkdown(cleanHTMLString: string) {
  const markdownString = unified()
    .use(rehypeParse, { fragment: true })
    .use(convertVideoToMarkdown)
    .use(removeUnderlines)
    .use(addSpacesToCheckboxes)
    .use(rehypeRemark)
    .use(remarkGfm)
    .use(remarkStringify, {
      handlers: { text: (node) => node.value },
    })
    .processSync(cleanHTMLString);

  let result = markdownString.value as string;

  // Remove extra blank lines between list items
  result = result.replace(/\n\n(?=\d+\.|-|\*)/g, "\n");

  return result;
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
