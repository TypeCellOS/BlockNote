import { Fragment } from "@tiptap/pm/model";
import {
  BlockNoDefaults,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import {
  containerDissolves,
  isContainerOnly,
  minChildren,
} from "../../schema/blocks/containers.js";
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

    if (
      containerDissolves(node.type) &&
      node.childCount < minChildren(node.type)
    ) {
      // Only part of the container was selected (a single column of a column
      // list), so it can't stand on its own: what was selected inside it is
      // what comes out.
      node.forEach((child) => {
        if (isContainerOnly(child.type)) {
          child.forEach((grandChild) =>
            blocks.push(nodeToBlock(grandChild, node)),
          );
        } else {
          blocks.push(nodeToBlock(child, node));
        }
      });
      return false;
    }

    if (node.type.isInGroup("bnBlock")) {
      blocks.push(nodeToBlock(node, node));
      // don't descend into children, as they're already included in the block returned by nodeToBlock
      return false;
    }
    return true;
  });
  return blocks;
}
