import { Fragment } from "@tiptap/pm/model";
import {
  BlockNoDefaults,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import { getPmSchema } from "../pmUtil.js";
import { nodeToBlock } from "./nodeToBlock.js";

/**
 * Converts all Blocks within a fragment to BlockNote blocks.
 */
export function fragmentToBlocks<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(fragment: Fragment) {
  // first convert selection to blocknote-style blocks, and then
  // pass these to the exporter
  const blocks: BlockNoDefaults<B, I, S>[] = [];
  fragment.descendants((node) => {
    const pmSchema = getPmSchema(node);
    if (node.type.name === "blockContainer") {
      if (node.firstChild?.type.name === "blockGroup") {
        // selection started within a block group
        // in this case the fragment starts with:
        // <blockContainer>
        //   <blockGroup>
        //     <blockContainer ... />
        //     <blockContainer ... />
        //   </blockGroup>
        // </blockContainer>
        //
        // instead of:
        // <blockContainer>
        //   <blockContent ... />
        //   <blockGroup>
        //     <blockContainer ... />
        //     <blockContainer ... />
        //   </blockGroup>
        // </blockContainer>
        //
        // so we don't need to serialize this block, just descend into the children of the blockGroup
        return true;
      }
    }

    if (node.type.name === "columnList" && node.childCount === 1) {
      // column lists with a single column should be flattened (not the entire column list has been selected)
      node.firstChild?.forEach((child) => {
        blocks.push(nodeToBlock(child, pmSchema));
      });
      return false;
    }

    if (node.type.isInGroup("bnBlock")) {
      blocks.push(nodeToBlock(node, pmSchema));
      // don't descend into children, as they're already included in the block returned by nodeToBlock
      return false;
    }
    return true;
  });
  return blocks;
}
