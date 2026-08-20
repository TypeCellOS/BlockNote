import { DOMParser, Schema } from "prosemirror-model";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";

import { Block } from "../../../blocks/defaultBlocks.js";
import { EMPTY_BLOCK_PLACEHOLDER } from "../../exporters/html/util/serializeBlocksExternalHTML.js";
import { nodeToBlock } from "../../nodeConversions/nodeToBlock.js";
import { nestedListsToBlockNoteStructure } from "./util/nestedLists.js";
import { preprocessHTMLWhitespace } from "./util/normalizeWhitespace.js";

/**
 * Removes the placeholder character that the external HTML exporter inserts
 * into empty inline-content blocks (see `EMPTY_BLOCK_PLACEHOLDER`). The
 * placeholder keeps such blocks from being dropped while the HTML is parsed;
 * stripping it here lets the block round trip back to genuinely empty content.
 */
function stripEmptyBlockPlaceholder(content: any[]): any[] {
  const stripped: any[] = [];

  for (const item of content) {
    if (item.type === "text") {
      const text = item.text.split(EMPTY_BLOCK_PLACEHOLDER).join("");
      if (text.length > 0) {
        stripped.push({ ...item, text });
      }
    } else if (Array.isArray(item.content)) {
      // Links and custom inline content that hold nested styled text.
      stripped.push({
        ...item,
        content: stripEmptyBlockPlaceholder(item.content),
      });
    } else {
      stripped.push(item);
    }
  }

  return stripped;
}

function stripEmptyBlockPlaceholderFromBlocks(blocks: Block<any, any, any>[]) {
  for (const block of blocks) {
    if (Array.isArray(block.content)) {
      (block as any).content = stripEmptyBlockPlaceholder(block.content);
    }
    if (block.children.length > 0) {
      stripEmptyBlockPlaceholderFromBlocks(block.children);
    }
  }
}

export function HTMLToBlocks<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(html: string, pmSchema: Schema): Block<BSchema, I, S>[] {
  const htmlNode = nestedListsToBlockNoteStructure(html);
  preprocessHTMLWhitespace(htmlNode);
  const parser = DOMParser.fromSchema(pmSchema);

  // Other approach might be to use
  // const doc = pmSchema.nodes["doc"].createAndFill()!;
  // and context: doc.resolve(3),

  const parentNode = parser.parse(htmlNode, {
    topNode: pmSchema.nodes["blockGroup"].create(),
  });

  const blocks: Block<BSchema, I, S>[] = [];

  for (let i = 0; i < parentNode.childCount; i++) {
    blocks.push(nodeToBlock(parentNode.child(i), parentNode));
  }

  stripEmptyBlockPlaceholderFromBlocks(blocks);

  return blocks;
}
