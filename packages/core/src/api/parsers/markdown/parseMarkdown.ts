import { Schema } from "prosemirror-model";

import { Block } from "../../../blocks/defaultBlocks.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import { initializeESMDependencies } from "../../../util/esmDependencies.js";
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

export async function markdownToHTML(markdown: string): Promise<string> {
  const deps = await initializeESMDependencies();

  const htmlString = deps.unified
    .unified()
    .use(deps.remarkParse.default)
    .use(deps.remarkGfm.default)
    .use(deps.remarkRehype.default, {
      handlers: {
        ...(deps.remarkRehype.defaultHandlers as any),
        image: (state: any, node: any) => {
          const url = String(node?.url || "");

          if (isVideoUrl(url)) {
            return video(state, node);
          } else {
            return deps.remarkRehype.defaultHandlers.image(state, node);
          }
        },
        code,
      },
    })
    .use(deps.rehypeStringify.default)
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
