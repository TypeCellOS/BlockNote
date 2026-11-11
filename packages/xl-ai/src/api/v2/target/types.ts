import type { BlockFields } from "../model.js";

/**
 * A row of the correspondence (see `TextRow`), with the fields of its block.
 *
 * @internal
 */
export type TargetRow =
  /** A source block that stays, with its merged fields. */
  | {
      kind: "kept";
      id: string;
      viewIndex: number;
      moved: boolean;
      fields: BlockFields;
    }
  /** A new block, with the fields of the text block. */
  | {
      kind: "new";
      viewIndex: number | undefined;
      fields: BlockFields;
    }
  | { kind: "skipped"; viewIndex: number };

/** @internal */
export type KeptRow = Extract<TargetRow, { kind: "kept" }>;

/** @internal */
export type TargetWarning =
  /**
   * The text changed or removed a part of the text that does not come from
   * one document block (`text` is that part, as the format shows it). The
   * target stage cannot apply this change, thus it does not use it. An empty view
   * block without a document block gives no warning.
   */
  | { type: "unlinked-block-changed"; text: string }
  /**
   * The format shows the block with content of a different shape (for
   * example a table as lines of text), and the text changed that content.
   * The block takes the type of the text block. Thus, its old content and
   * the props of its old type are lost.
   */
  | { type: "block-shape-replaced"; id: string };
