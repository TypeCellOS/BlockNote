import { BlockSpecs } from "@blocknote/core";

export function blocksToBlockSpecs(blocks: JSX.Element): BlockSpecs {
  const blockSpecs: BlockSpecs = {};
  blocks.props.children.forEach((block: JSX.Element) => {
    console.log(block);
  });
  return blockSpecs;
}
