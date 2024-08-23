import { Schema } from "prosemirror-model";
import { PartialBlock } from "../../../blocks/defaultBlocks";
import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor";
import { BlockSchema, InlineContentSchema, StyleSchema } from "../../../schema";
import { createExternalHTMLExporter } from "../html/externalHTMLExporter";
import { removeUnderlines } from "./removeUnderlinesRehypePlugin";
import { addSpacesToCheckboxes } from "./util/addSpacesToCheckboxesRehypePlugin";

export async function cleanHTMLToMarkdown(cleanHTMLString: string) {
  const rehypeParse = await import("rehype-parse");

  const unified = await import("unified");
  const rehypeRemark = await import("rehype-remark");
  const remarkGfm = await import("remark-gfm");
  const remarkStringify = await import("remark-stringify");

  const markdownString = unified
    .unified()
    .use(rehypeParse.default, { fragment: true })
    .use(removeUnderlines)
    .use(await addSpacesToCheckboxes())
    .use(rehypeRemark.default)
    .use(remarkGfm.default)
    .use(remarkStringify.default, { handlers: { text: (node) => node.value } })
    .processSync(cleanHTMLString);

  return markdownString.value as string;
}

export async function blocksToMarkdown<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  blocks: PartialBlock<BSchema, I, S>[],
  schema: Schema,
  editor: BlockNoteEditor<BSchema, I, S>,
  options: { document?: Document }
): Promise<string> {
  const exporter = await createExternalHTMLExporter(schema, editor);
  const externalHTML = exporter.exportBlocks(blocks, options);

  return cleanHTMLToMarkdown(externalHTML);
}
