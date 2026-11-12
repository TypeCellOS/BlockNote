import type { BlockFields } from "../model.js";

/**
 * What the target stage does with one block of the text (a row), with the
 * fields of the block (see `targetFromPairs`).
 *
 * @internal
 */
export type TargetRow =
  /**
   * The text block is a source block that stays (`id`), and its pair is the
   * view block `viewIndex`. Its fields are the result of the three-way
   * merge.
   */
  | {
      kind: "kept";
      id: string;
      viewIndex: number;
      /** The text moved the block (rule 2 of `alignBlocks`). */
      moved: boolean;
      fields: BlockFields;
    }
  /** A new block, with a new ID and the fields of the text block. */
  | {
      kind: "new";
      id: string;
      fields: BlockFields;
    };

/** @internal */
export type KeptRow = Extract<TargetRow, { kind: "kept" }>;

/** @internal */
export type TargetWarning =
  /**
   * The format shows the block with content of a different shape, and the
   * text changed that content. The block takes the type of the text block.
   * Thus, its old content and the props of its old type are lost. Example:
   * markdown and HTML show a file block without a caption as a paragraph
   * with a link. A change of the link text makes the block a paragraph,
   * without its URL and name.
   */
  { type: "block-shape-replaced"; id: string };
