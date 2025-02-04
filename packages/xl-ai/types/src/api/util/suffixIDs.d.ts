import type { Block, BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
export declare function suffixIDs<T extends Block<BlockSchema, InlineContentSchema, StyleSchema>>(blocks: T[]): T[];
