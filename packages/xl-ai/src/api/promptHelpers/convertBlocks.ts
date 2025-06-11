import { Block } from "@blocknote/core";

export async function convertBlocks<T>(source: Block<any, any, any>[], mapFn: (block: Block<any, any, any>) => Promise<T>): Promise<Array<{
    id: string;
    block: T;
}>> {
  return await Promise.all(source.map(async (block) => {
    return {
      id: block.id,
      block: await mapFn(block),
    };
  }));
}