import { Block } from "@blocknote/core";

export function flattenBlocks(
  source: Block<any, any, any>[],
): Array<Block<any, any, any>> {
  return source.flatMap((block) => [
    {
      ...block,
      children: [],
    },
    ...flattenBlocks(block.children),
  ]);
}
