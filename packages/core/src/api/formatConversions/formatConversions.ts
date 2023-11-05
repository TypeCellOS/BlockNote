import { DOMParser, Schema } from "prosemirror-model";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype, { defaultHandlers } from "remark-rehype";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { Block, BlockSchema } from "../../extensions/Blocks/api/blockTypes";

import { blockToNode, nodeToBlock } from "../nodeConversions/nodeConversions";
import { removeUnderlines } from "./removeUnderlinesRehypePlugin";
import { simplifyBlocks } from "./simplifyBlocksRehypePlugin";
import { customBlockSerializer } from "../serialization/serialization";
import { BlockNoteEditor } from "../../BlockNoteEditor";

export async function blocksToHTML<BSchema extends BlockSchema>(
  blocks: Block<BSchema>[],
  schema: Schema,
  editor: BlockNoteEditor<BSchema>
): Promise<string> {
  const htmlParentElement = document.createElement("div");
  const serializer = customBlockSerializer(schema, editor);

  for (const block of blocks) {
    const node = blockToNode(block, schema);
    const htmlNode = serializer.serializeNode(node);
    htmlParentElement.appendChild(htmlNode);
  }

  const htmlString = await unified()
    .use(rehypeParse, { fragment: true })
    .use(simplifyBlocks, {
      orderedListItemBlockTypes: new Set<string>(["numberedListItem"]),
      unorderedListItemBlockTypes: new Set<string>(["bulletListItem"]),
    })
    .use(rehypeStringify)
    .process(htmlParentElement.innerHTML);

  return htmlString.value as string;
}

export async function HTMLToBlocks<BSchema extends BlockSchema>(
  html: string,
  blockSchema: BSchema,
  schema: Schema
): Promise<Block<BSchema>[]> {
  const htmlNode = document.createElement("div");
  htmlNode.innerHTML = html.trim();

  const parser = DOMParser.fromSchema(schema);
  const parentNode = parser.parse(htmlNode); //, { preserveWhitespace: "full" });

  const blocks: Block<BSchema>[] = [];

  for (let i = 0; i < parentNode.firstChild!.childCount; i++) {
    blocks.push(nodeToBlock(parentNode.firstChild!.child(i), blockSchema));
  }

  return blocks;
}

export async function blocksToMarkdown<BSchema extends BlockSchema>(
  blocks: Block<BSchema>[],
  schema: Schema,
  editor: BlockNoteEditor<BSchema>
): Promise<string> {
  const markdownString = await unified()
    .use(rehypeParse, { fragment: true })
    .use(removeUnderlines)
    .use(rehypeRemark)
    .use(remarkGfm)
    .use(remarkStringify)
    .process(await blocksToHTML(blocks, schema, editor));

  return markdownString.value as string;
}

// modefied version of https://github.com/syntax-tree/mdast-util-to-hast/blob/main/lib/handlers/code.js
// that outputs a data-language attribute instead of a CSS class (e.g.: language-typescript)
function code(state: any, node: any) {
  const value = node.value ? node.value + "\n" : "";
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

export async function markdownToBlocks<BSchema extends BlockSchema>(
  markdown: string,
  blockSchema: BSchema,
  schema: Schema
): Promise<Block<BSchema>[]> {
  const htmlString = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, {
      handlers: {
        ...(defaultHandlers as any),
        code,
      },
    })
    .use(rehypeStringify)
    .process(markdown);

  return HTMLToBlocks(htmlString.value as string, blockSchema, schema);
}

// Takes structured HTML and makes it comply with the HTML spec using the
// `simplifyBlocks` plugin.
// TODO: Remove classes?
export async function cleanHTML(structuredHTMLString: string) {
  const cleanHTMLString = await unified()
    .use(rehypeParse, { fragment: true })
    .use(simplifyBlocks, {
      orderedListItemBlockTypes: new Set<string>(["numberedListItem"]),
      unorderedListItemBlockTypes: new Set<string>(["bulletListItem"]),
    })
    .use(rehypeStringify)
    .process(structuredHTMLString);

  return cleanHTMLString.value as string;
}

export async function markdown(cleanHTMLString: string) {
  const markdownString = await unified()
    .use(rehypeParse, { fragment: true })
    .use(removeUnderlines)
    .use(rehypeRemark)
    .use(remarkGfm)
    .use(remarkStringify)
    .process(cleanHTMLString);

  return markdownString.value as string;
}
