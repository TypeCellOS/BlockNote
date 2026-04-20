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
export function cleanHTMLToMarkdown(cleanHTMLString: string) {
  const deps = esmDependencies;

  if (!deps) {
    throw new Error(
      "cleanHTMLToMarkdown requires ESM dependencies to be initialized",
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
      handlers: {
        text: (node) => node.value,
        // Prevent autolink format <url> output plain URL instead
        link: (node, _parent, state) => {
          const children = state.containerPhrasing(node, {
            before: "[",
            after: "]",
            lineShift: 0,
            now: { line: 1, column: 1, offset: 0 },
          });
          if (!children || children === node.url) {
            return node.url;
          }
          return `[${children}](${node.url})`;
        },
      },
    })
    .processSync(cleanHTMLString);

  return markdownString.value as string;
}

export async function blocksToMarkdown<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  blocks: PartialBlock<BSchema, I, S>[],
  schema: Schema,
  editor: BlockNoteEditor<BSchema, I, S>,
  options: { document?: Document },
): Promise<string> {
  await initializeESMDependencies();
  const exporter = createExternalHTMLExporter(schema, editor);
  const externalHTML = exporter.exportBlocks(blocks, options);

  return cleanHTMLToMarkdown(externalHTML);
}
