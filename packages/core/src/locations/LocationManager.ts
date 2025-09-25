import type { Node, Transaction } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import { Block } from "../blocks/defaultBlocks.js";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../schema/index.js";
import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
} from "../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { getNodeById } from "../api/nodeUtil.js";
import {
  getBlockInfo,
  getBlockInfoFromTransaction,
  getNearestBlockPos,
} from "../api/getBlockInfoFromPos.js";
import { nodeToBlock } from "../api/nodeConversions/nodeToBlock.js";
import { getPmSchema } from "../api/pmUtil.js";
import { BlockId, BlockIdentifier, Location, Point, Range } from "./types.js";
import {
  isBlockId,
  isBlockIdentifier,
  isPoint,
  isRange,
  normalizeToRange,
  toId,
} from "./utils.js";

/**
 * LocationManager provides methods to resolve and work with locations within a BlockNote document.
 * It handles the conversion between Location types and ProseMirror positions.
 */
export class LocationManager<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema,
> {
  constructor(private editor: BlockNoteEditor<BSchema, ISchema, SSchema>) {}

  /**
   * Resolves a location to a ProseMirror position or range.
   * @param location The location to resolve
   * @returns The resolved ProseMirror position or range
   */
  public resolveLocation(
    location: Location,
    opts: {
      /**
       * Whether to include child blocks as part of the response
       * @default true
       */
      includeChildren: boolean;
    },
  ): {
    from: number;
    to: number;
    blockIds: BlockId[];
  } {
    return this.resolveRange(normalizeToRange(location));
  }

  /**
   * Resolves a BlockId to a ProseMirror position.
   * @param blockId The block ID to resolve
   * @returns The point that this block represents
   */
  private resolveBlockIdToPoint(blockId: BlockId): Point {
    return {
      id: blockId,
      offset: -1,
    };
  }

  /**
   * Resolves a Point to a ProseMirror position.
   * @param point The point to resolve
   * @returns The resolved ProseMirror position
   */
  private resolvePoint(point: Point): {
    from: number;
    to: number;
    blockIds: BlockId[];
  } {
    const posInfo = getNodeById(point.id, this.editor.prosemirrorState.doc);
    if (!posInfo) {
      // TODO should we be throwing errors here?
      throw new Error(`Block with ID ${point.id} not found`);
    }

    // If offset is -1, treat as block-level operation
    if (point.offset === -1) {
      return {
        from: posInfo.posBeforeNode,
        to: posInfo.posBeforeNode + posInfo.node.nodeSize,
        blockIds: [point.id],
      };
    }

    const block = nodeToBlock(posInfo.node);

    const blockContent = blockInfo.blockContent;
    const contentType = this.getBlockContentType(blockInfo);

    let from: number;
    let to: number;

    if (contentType === "none") {
      // For blocks with no content, position at the block level
      from = posInfo.posBeforeNode;
      to = posInfo.posBeforeNode + posInfo.node.nodeSize;
    } else if (contentType === "inline") {
      // For inline content, calculate position within the content
      const contentStart = blockContent.beforePos + 1;
      const contentEnd = blockContent.afterPos - 1;
      const maxOffset = contentEnd - contentStart;

      if (point.offset > maxOffset) {
        throw new Error(
          `Offset ${point.offset} exceeds block content length ${maxOffset}`,
        );
      }

      from = contentStart + point.offset;
      to = contentStart + point.offset;
    } else if (contentType === "table") {
      // For table content, we need to navigate to the first cell
      const cellStart = blockContent.beforePos + 4; // Skip table, tableRow, tableCell
      const cellEnd = blockContent.afterPos - 4;
      const maxOffset = cellEnd - cellStart;

      if (point.offset > maxOffset) {
        throw new Error(
          `Offset ${point.offset} exceeds table content length ${maxOffset}`,
        );
      }

      from = cellStart + point.offset;
      to = cellStart + point.offset;
    } else {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    return {
      from,
      to,
      blockId: point.id,
    };
  }

  /**
   * Resolves a Range to ProseMirror positions.
   * @param range The range to resolve
   * @returns The resolved ProseMirror positions
   */
  private resolveRange(range: Range): {
    from: number;
    to: number;
    blockIds: BlockId[];
  } {
    const anchorPos = this.resolvePoint(range.anchor);
    const headPos = this.resolvePoint(range.head);

    return {
      from: Math.min(anchorPos.from, headPos.from),
      to: Math.max(anchorPos.to, headPos.to),
      blockId: range.anchor.id, // Use anchor block ID as primary
    };
  }

  /**
   * Gets the content type of a block for position calculations.
   * @param blockInfo The block info
   * @returns The content type
   */
  private getBlockContentType(blockInfo: any): "none" | "inline" | "table" {
    const pmSchema = getPmSchema(this.editor.prosemirrorState.doc);
    const schema = this.editor.schema;

    const blockType = blockInfo.blockNoteType;
    const blockConfig = schema.blockSchema[blockType];

    if (!blockConfig) {
      throw new Error(`Unknown block type: ${blockType}`);
    }

    return blockConfig.content;
  }

  /**
   * Sets the selection to a location.
   * @param location The location to select
   */
  public setSelectionToLocation(location: Location): void {
    const resolved = this.resolveLocation(location);

    this.editor.transact((tr) => {
      tr.setSelection(TextSelection.create(tr.doc, resolved.from, resolved.to));
    });
  }

  /**
   * Gets the current selection as a Location.
   * @returns The current selection as a Location, or undefined if no selection
   */
  public getCurrentSelectionAsLocation(): Location | undefined {
    const selection = this.editor.prosemirrorState.selection;

    if (selection.empty) {
      return undefined;
    }

    // Get block info for anchor and head positions
    const anchorBlockInfo = getBlockInfo(
      this.editor.prosemirrorState.doc.resolve(selection.from),
    );
    const headBlockInfo = getBlockInfo(
      this.editor.prosemirrorState.doc.resolve(selection.to),
    );

    // If selection is within a single block, return a Point
    if (anchorBlockInfo.blockId === headBlockInfo.blockId) {
      const offset = this.calculateOffsetInBlock(
        anchorBlockInfo,
        selection.from,
      );
      return {
        id: anchorBlockInfo.blockId,
        offset,
      };
    }

    // If selection spans multiple blocks, return a Range
    const anchorOffset = this.calculateOffsetInBlock(
      anchorBlockInfo,
      selection.from,
    );
    const headOffset = this.calculateOffsetInBlock(headBlockInfo, selection.to);

    return {
      anchor: {
        id: anchorBlockInfo.blockId,
        offset: anchorOffset,
      },
      head: {
        id: headBlockInfo.blockId,
        offset: headOffset,
      },
    };
  }

  /**
   * Calculates the character offset within a block.
   * @param blockInfo The block info
   * @param pos The ProseMirror position
   * @returns The character offset
   */
  private calculateOffsetInBlock(blockInfo: any, pos: number): number {
    if (!blockInfo.isBlockContainer) {
      return -1; // Block-level operation
    }

    const blockContent = blockInfo.blockContent;
    const contentType = this.getBlockContentType(blockInfo);

    if (contentType === "none") {
      return -1; // Block-level operation
    } else if (contentType === "inline") {
      return pos - (blockContent.beforePos + 1);
    } else if (contentType === "table") {
      return pos - (blockContent.beforePos + 4);
    }

    return -1;
  }
}
