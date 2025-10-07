import {
  getSelection,
  getSelectionCutBlocks,
  setSelection,
} from "../../api/blockManipulation/selections/selection.js";
import {
  getTextCursorPosition,
  setTextCursorPosition,
} from "../../api/blockManipulation/selections/textCursorPosition.js";
import { isNodeSelection, posToDOMRect } from "@tiptap/core";
import {
  BlockIdentifier,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../schema/index.js";
import {
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
} from "../../blocks/defaultBlocks.js";
import { Selection } from "../selectionTypes.js";
import { TextCursorPosition } from "../cursorPositionTypes.js";
import { BlockNoteEditor } from "../BlockNoteEditor.js";

export class SelectionManager<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema,
> {
  constructor(private editor: BlockNoteEditor<BSchema, ISchema, SSchema>) {}

  /**
   * Gets a snapshot of the current selection. This contains all blocks (included nested blocks)
   * that the selection spans across.
   *
   * If the selection starts / ends halfway through a block, the returned data will contain the entire block.
   */
  public getSelection(): Selection<BSchema, ISchema, SSchema> | undefined {
    return this.editor.transact((tr) => getSelection(tr));
  }

  /**
   * Gets a snapshot of the current selection. This contains all blocks (included nested blocks)
   * that the selection spans across.
   *
   * If the selection starts / ends halfway through a block, the returned block will be
   * only the part of the block that is included in the selection.
   */
  public getSelectionCutBlocks() {
    return this.editor.transact((tr) => getSelectionCutBlocks(tr));
  }

  /**
   * Sets the selection to a range of blocks.
   * @param startBlock The identifier of the block that should be the start of the selection.
   * @param endBlock The identifier of the block that should be the end of the selection.
   */
  public setSelection(startBlock: BlockIdentifier, endBlock: BlockIdentifier) {
    return this.editor.transact((tr) => setSelection(tr, startBlock, endBlock));
  }

  /**
   * Gets a snapshot of the current text cursor position.
   * @returns A snapshot of the current text cursor position.
   */
  public getTextCursorPosition(): TextCursorPosition<
    BSchema,
    ISchema,
    SSchema
  > {
    return this.editor.transact((tr) => getTextCursorPosition(tr));
  }

  /**
   * Sets the text cursor position to the start or end of an existing block. Throws an error if the target block could
   * not be found.
   * @param targetBlock The identifier of an existing block that the text cursor should be moved to.
   * @param placement Whether the text cursor should be placed at the start or end of the block.
   */
  public setTextCursorPosition(
    targetBlock: BlockIdentifier,
    placement: "start" | "end" = "start",
  ) {
    return this.editor.transact((tr) =>
      setTextCursorPosition(tr, targetBlock, placement),
    );
  }

  /**
   * Gets the bounding box of the current selection.
   */
  public getSelectionBoundingBox() {
    if (!this.editor.prosemirrorView) {
      return undefined;
    }

    const { selection } = this.editor.prosemirrorState;

    // support for CellSelections
    const { ranges } = selection;
    const from = Math.min(...ranges.map((range) => range.$from.pos));
    const to = Math.max(...ranges.map((range) => range.$to.pos));

    if (isNodeSelection(selection)) {
      const node = this.editor.prosemirrorView.nodeDOM(from) as HTMLElement;
      if (node) {
        return node.getBoundingClientRect();
      }
    }

    return posToDOMRect(this.editor.prosemirrorView, from, to);
  }
}
