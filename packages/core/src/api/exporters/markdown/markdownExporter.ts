import { Schema } from "prosemirror-model";
import { PartialBlock } from "../../../blocks/defaultBlocks.js";
import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import {
  esmDependencies,
  initializeESMDependencies,
} from "../../../util/esmDependencies.js";
import { createExternalHTMLExporter } from "../html/externalHTMLExporter.js";
import { removeUnderlines } from "./removeUnderlinesRehypePlugin.js";
import { addSpacesToCheckboxes } from "./util/addSpacesToCheckboxesRehypePlugin.js";

// Needs to be sync because it's used in drag handler event (SideMenuPlugin)
// Ideally, call `await initializeESMDependencies()` before calling this function
export function cleanHTMLToMarkdown(
  cleanHTMLString: string,
  options?: {
    keepEmptyParagraphs: boolean;
  }
) {
  const deps = esmDependencies;

  if (!deps) {
    throw new Error(
      "cleanHTMLToMarkdown requires ESM dependencies to be initialized"
    );
  }

  if (options?.keepEmptyParagraphs) {
    // replace empty paragraphs with [EMPTY-LINE]
    // otherwise the unified pipeline will get rid of these
    cleanHTMLString = cleanHTMLString.replace(
      /<p><\/p>/g,
      "<p>[EMPTY-LINE]</p>"
    );
  }
  const markdownString = deps.unified
    .unified()
    .use(deps.rehypeParse.default, { fragment: true })
    .use(removeUnderlines)
    .use(addSpacesToCheckboxes)
    .use(deps.rehypeRemark.default)
    .use(deps.remarkGfm.default)
    .use(deps.remarkStringify.default, {
      handlers: { text: (node) => node.value },
    })
    .processSync(cleanHTMLString);

  let ret = markdownString.value as string;
  if (options?.keepEmptyParagraphs) {
    // remove [EMPTY-LINE] hacks we added earlier
    ret = ret.replace(/\n\[EMPTY-LINE\]\n/g, "\n\n");
  }
  return ret;
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
  await initializeESMDependencies();
  const exporter = createExternalHTMLExporter(schema, editor);
  const externalHTML = exporter.exportBlocks(blocks, options);

  const ret = cleanHTMLToMarkdown(externalHTML, {
    keepEmptyParagraphs: true,
  });

  return ret;
}
