import { Schema } from "prosemirror-model";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype, {
  defaultHandlers as remarkRehypeDefaultHandlers,
} from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";

import { Block } from "../../../blocks/defaultBlocks.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import { HTMLToBlocks } from "../html/parseHTML.js";

// modified version of https://github.com/syntax-tree/mdast-util-to-hast/blob/main/lib/handlers/code.js
// that outputs a data-language attribute instead of a CSS class (e.g.: language-typescript)
function code(state: any, node: any) {
  const value = node.value ? node.value : "";
  /** @type {Properties} */
  const properties: any = {};

  if (node.lang) {
    // changed line
    properties["data-language"] = node.lang;
  }

  // Create `<code>`.
  /** @type {Element} */
  let result: any = {
    type: "element",
    tagName: "code",
    properties,
    children: [{ type: "text", value }],
  };

  if (node.meta) {
    result.data = { meta: node.meta };
  }

  state.patch(node, result);
  result = state.applyData(node, result);

  // Create `<pre>`.
  result = {
    type: "element",
    tagName: "pre",
    properties: {},
    children: [result],
  };
  state.patch(node, result);
  return result;
}

export async function markdownToHTML(markdown: string): Promise<string> {
  const htmlString = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, {
      handlers: {
        ...(remarkRehypeDefaultHandlers as any),
        code,
      },
    })
    .use(rehypeStringify)
    .processSync(markdown);

  return htmlString.value as string;
}

export async function markdownToBlocks<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(markdown: string, pmSchema: Schema): Promise<Block<BSchema, I, S>[]> {
  const htmlString = await markdownToHTML(markdown);

  return HTMLToBlocks(htmlString, pmSchema);
}
