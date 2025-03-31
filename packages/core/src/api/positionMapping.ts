import type { Transaction } from "prosemirror-state";
import { Mapping } from "prosemirror-transform";
import {
  absolutePositionToRelativePosition,
  relativePositionToAbsolutePosition,
  ySyncPluginKey,
} from "y-prosemirror";
import type { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import * as Y from "yjs";
import type { ProsemirrorBinding } from "y-prosemirror";
import type {
  DefaultInlineContentSchema,
  DefaultStyleSchema,
} from "../blocks/defaultBlocks.js";
import type { DefaultBlockSchema } from "../blocks/defaultBlocks.js";
import type {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../schema/index.js";

export function isRemoteTransaction(tr: Transaction) {
  return tr.getMeta(ySyncPluginKey) !== undefined;
}

type YSyncPluginState = {
  doc: Y.Doc;
  binding: Pick<ProsemirrorBinding, "type" | "mapping">;
};

/**
 * This is used to keep track of positions of elements in the editor.
 * It is needed because y-prosemirror's sync plugin can disrupt normal prosemirror position mapping.
 *
 * It is specifically made to be able to be used whether the editor is being used in a collaboratively, or single user, providing the same API.
 */
export class PositionStorage<
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema
> {
  private readonly editor: BlockNoteEditor<BSchema, ISchema, SSchema>;
  /**
   * Whether the editor has had a remote transaction.
   */
  private hadRemoteTransaction = false;

  private readonly mapping = new Mapping();
  private mappingLength = 0;

  constructor(
    editor: BlockNoteEditor<BSchema, ISchema, SSchema>,
    { shouldMount = true }: { shouldMount?: boolean } = {}
  ) {
    this.editor = editor;
    this.onTransactionHandler = this.onTransactionHandler.bind(this);

    if (!shouldMount) {
      return;
    }

    if (!this.editor._tiptapEditor) {
      throw new Error("Editor not mounted");
    }
    this.editor._tiptapEditor.on("transaction", this.onTransactionHandler);
  }

  /**
   * This will be called whenever a transaction is applied to the editor.
   *
   * It's used to update the position mapping or tell if there was a remote transaction.
   */
  private onTransactionHandler({ transaction }: { transaction: Transaction }) {
    if (this.hadRemoteTransaction) {
      // If we have already had a remote transaction, we rely only on relative positions, so no need to update the mapping.
      return;
    }

    if (isRemoteTransaction(transaction)) {
      this.hadRemoteTransaction = true;
    } else {
      this.mapping.appendMapping(transaction.mapping);
      this.mappingLength += transaction.mapping.maps.length;
    }
  }

  /**
   * This is used to track a position in the editor.
   *
   * @param position The position to track.
   * @param side The side of the position to track. "left" is the default. "right" would move with the change if the change is in the right direction.
   * @param getOffset This allows you to offset the returned position from the tracked position. This is useful for cases where the tracked position is not the actual position of the element.
   */
  public track(
    /**
     * The position to track.
     */
    position: number,
    /**
     * This is the side of the position to track. "left" is the default. "right" would move with the change if the change is in the right direction.
     */
    side: "left" | "right" = "left"
  ): () => number {
    const ySyncPluginState = ySyncPluginKey.getState(
      this.editor._tiptapEditor.state
    ) as YSyncPluginState;

    const trackedMapLength = this.mappingLength;
    if (!ySyncPluginState) {
      return () => {
        const pos = this.mapping
          .slice(trackedMapLength)
          .map(position, side === "left" ? -1 : 1);

        return pos;
      };
    }

    const relativePosition = absolutePositionToRelativePosition(
      // Track the position after the position if we are on the right side
      position + (side === "right" ? 1 : 0),
      ySyncPluginState.binding.type,
      ySyncPluginState.binding.mapping
    );

    return () => {
      const ystate = ySyncPluginKey.getState(
        this.editor._tiptapEditor.state
      ) as YSyncPluginState;
      const rel = relativePositionToAbsolutePosition(
        ystate.doc,
        ystate.binding.type,
        relativePosition,
        ystate.binding.mapping
      );

      // This can happen if the element is deleted
      if (rel === null) {
        throw new Error("Element deleted");
      }

      return rel + (side === "right" ? -1 : 0);
    };
  }
}
