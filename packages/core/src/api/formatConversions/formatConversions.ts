import { DOMParser, DOMSerializer, Schema } from "prosemirror-model";
import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import rehypeRemark from "rehype-remark";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { Block } from "../../extensions/Blocks/api/blockTypes";
import { blockToNode, nodeToBlock } from "../nodeConversions/nodeConversions";
import { simplifyBlocks } from "./simplifyBlocksRehypePlugin";
import { removeUnderlines } from "./removeUnderlinesRehypePlugin";

export async function blocksToHTML(
  blocks: Block[],
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
  htmlString: string,
  schema: Schema
): Promise<Block[]> {
  const htmlNode = document.createElement("div");
  htmlNode.innerHTML = htmlString.trim();

  const parser = DOMParser.fromSchema(schema);
  const parentNode = parser.parse(htmlNode);

  const blocks: Block[] = [];

  for (let i = 0; i < parentNode.firstChild!.childCount; i++) {
    blocks.push(nodeToBlock(parentNode.firstChild!.child(i)));
  }

  return blocks;
}

export async function blocksToMarkdown(
  blocks: Block[],
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
  markdownString: string,
  schema: Schema
): Promise<Block[]> {
  const htmlString = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdownString);

  return HTMLToBlocks(htmlString.value as string, schema);
}
