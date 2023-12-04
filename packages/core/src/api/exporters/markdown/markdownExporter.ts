import { Schema } from "prosemirror-model";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor";
import {
  Block,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema";
import { createExternalHTMLExporter } from "../html/externalHTMLExporter";
import { removeUnderlines } from "./removeUnderlinesRehypePlugin";

export function cleanHTMLToMarkdown(cleanHTMLString: string) {
  const markdownString = unified()
    .use(rehypeParse, { fragment: true })
    .use(removeUnderlines)
    .use(rehypeRemark)
    .use(remarkGfm)
    .use(remarkStringify)
    .processSync(cleanHTMLString);

  return markdownString.value as string;
}

export function blocksToMarkdown<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  blocks: Block<BSchema, I, S>[],
  schema: Schema,
  editor: BlockNoteEditor<BSchema, I, S>
): string {
  const exporter = createExternalHTMLExporter(schema, editor);
  const externalHTML = exporter.exportBlocks(blocks);

  return cleanHTMLToMarkdown(externalHTML);
}
