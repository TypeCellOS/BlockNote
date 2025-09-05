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
import { isVideoUrl } from "../../../util/string.js";

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

function video(state: any, node: any) {
  const url = String(node?.url || "");
  const title = node?.title ? String(node.title) : undefined;

  let result: any = {
    type: "element",
    tagName: "video",
    properties: {
      src: url,
      "data-name": title,
      "data-url": url,
      controls: true,
    },
    children: [],
  };
  state.patch?.(node, result);
  result = state.applyData ? state.applyData(node, result) : result;

  return result;
}

export function markdownToHTML(markdown: string): string {
  const htmlString = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, {
      handlers: {
        ...(remarkRehypeDefaultHandlers as any),
        image: (state: any, node: any) => {
          const url = String(node?.url || "");

          if (isVideoUrl(url)) {
            return video(state, node);
          } else {
            return remarkRehypeDefaultHandlers.image(state, node);
          }
        },
        code,
      },
    })
    .use(rehypeStringify)
    .processSync(markdown);

  return htmlString.value as string;
}

export function markdownToBlocks<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(markdown: string, pmSchema: Schema): Block<BSchema, I, S>[] {
  const htmlString = markdownToHTML(markdown);

  return HTMLToBlocks(htmlString, pmSchema);
}
