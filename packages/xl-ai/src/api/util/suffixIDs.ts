import type {
  Block,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

export function suffixIDs<
  T extends Block<BlockSchema, InlineContentSchema, StyleSchema>
>(blocks: T[]): T[] {
  return blocks.map((block) => ({
    ...block,
    id: `${block.id}$`,
    children: suffixIDs(block.children),
  }));
}
