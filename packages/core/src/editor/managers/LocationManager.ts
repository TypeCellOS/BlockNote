import {
  Block,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
} from "../../blocks/defaultBlocks.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import { BlockId, getBlockRange, Location } from "./Location.js";

export class LocationManager<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema,
> {
  constructor(private opts: { document: Block<BSchema, ISchema, SSchema>[] }) {}

  public get document(): Block<BSchema, ISchema, SSchema>[] {
    return this.opts.document;
  }

  private depthTreeCache: WeakMap<
    Block<BSchema, ISchema, SSchema>[],
    Map<
      BlockId,
      {
        block: Block<BSchema, ISchema, SSchema>;
        depth: number;
        parentId: BlockId | undefined;
        children: BlockId[];
        rootId: BlockId;
      }
    >
  > = new WeakMap();

  public get depthTree(): Map<
    BlockId,
    {
      block: Block<BSchema, ISchema, SSchema>;
      depth: number;
      parentId: BlockId | undefined;
      children: BlockId[];
      rootId: BlockId;
    }
  > {
    if (this.depthTreeCache.has(this.document)) {
      return this.depthTreeCache.get(this.document)!;
    }

    const depthTree = new Map<
      BlockId,
      {
        block: Block<BSchema, ISchema, SSchema>;
        depth: number;
        parentId: BlockId | undefined;
        children: BlockId[];
        rootId: BlockId;
      }
    >();

    const addBlockToTree = (
      block: Block<BSchema, ISchema, SSchema>,
      depth: number,
      parentId: BlockId | undefined,
      rootId: BlockId,
    ) => {
      depthTree.set(block.id, {
        block,
        depth,
        parentId,
        children: block.children?.map((b) => b.id) ?? [],
        rootId,
      });

      if (block.children) {
        block.children.forEach((child) => {
          addBlockToTree(child, depth + 1, block.id, rootId);
        });
      }
    };

    this.document.forEach((block) => {
      addBlockToTree(block, 0, undefined, block.id);
    });

    return depthTree;
  }

  /**
   * Returns all blocks that are included in the location (inclusive) only at the top level.
   */
  public getBlocks(location: Location): Block<BSchema, ISchema, SSchema>[] {
    const [startId, endId] = getBlockRange(location);
    const startBlock = this.depthTree.get(
      this.depthTree.get(startId)?.rootId || "",
    );
    const endBlock = this.depthTree.get(
      this.depthTree.get(endId)?.rootId || "",
    );

    if (!startBlock || !endBlock) {
      return [];
    }

    const startIndex = this.document.findIndex((block) => block.id === startId);
    const endIndex = this.document.findIndex((block) => block.id === endId);

    return this.document.slice(startIndex, endIndex + 1);
  }
}
