import { DOMParser, DOMSerializer, Schema } from "prosemirror-model";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import {
  BlockSchema,
  BlockTemplate,
} from "../../extensions/Blocks/api/blockTypes";

import { blockToNode, nodeToBlock } from "../nodeConversions/nodeConversions";
import { removeUnderlines } from "./removeUnderlinesRehypePlugin";
import { simplifyBlocks } from "./simplifyBlocksRehypePlugin";

export async function blocksToHTML(
  blocks: BlockTemplate<any, any>[],
  schema: Schema
): Promise<string> {
  const htmlParentElement = document.createElement("div");
  const serializer = DOMSerializer.fromSchema(schema);

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

export async function HTMLToBlocks(
  html: string,
  schema: Map<string, BlockSchema>,
  pmSchema: Schema
): Promise<BlockTemplate<any, any>[]> {
  const htmlNode = document.createElement("div");
  htmlNode.innerHTML = html.trim();

  const parser = DOMParser.fromSchema(pmSchema);
  const parentNode = parser.parse(htmlNode);

  const blocks: BlockTemplate<any, any>[] = [];

  for (let i = 0; i < parentNode.firstChild!.childCount; i++) {
    blocks.push(nodeToBlock(parentNode.firstChild!.child(i), schema));
  }

  return blocks;
}

export async function blocksToMarkdown(
  blocks: BlockTemplate<any, any>[],
  schema: Schema
): Promise<string> {
  const markdownString = await unified()
    .use(rehypeParse, { fragment: true })
    .use(removeUnderlines)
    .use(rehypeRemark)
    .use(remarkGfm)
    .use(remarkStringify)
    .process(await blocksToHTML(blocks, schema));

  return markdownString.value as string;
}

export async function markdownToBlocks(
  markdown: string,
  schema: Map<string, BlockSchema>,
  pmSchema: Schema
): Promise<BlockTemplate<any, any>[]> {
  const htmlString = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdown);

  return HTMLToBlocks(htmlString.value as string, schema, pmSchema);
}
