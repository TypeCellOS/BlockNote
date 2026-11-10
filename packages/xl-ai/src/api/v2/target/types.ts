import type { BlockFields } from "../blocks/index.js";

/** A row of the correspondence (see `TextRow`), with the fields of its block. */
export type TreeRow =
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
      id: string | undefined;
      fields: BlockFields;
    }
  | { kind: "skipped"; viewIndex: number | undefined };

export type KeptRow = Extract<TreeRow, { kind: "kept" }>;

export type TargetWarning =
  /**
   * The text moved, removed or split a part of a block that renders as more
   * than one view block, or that block has no text. An example is a code
   * block with blank lines, in plain text. The blocks of the text replace
   * the block. Thus, the data that the format does not show is lost. A
   * change of the text of the parts merges into the block (see
   * `joinParts`).
   */
  | { type: "multi-part-block-replaced"; id: string }
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
