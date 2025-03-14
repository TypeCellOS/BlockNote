import { Transaction } from "prosemirror-state";
import { Mapping } from "prosemirror-transform";
import {
  absolutePositionToRelativePosition,
  relativePositionToAbsolutePosition,
  ySyncPluginKey,
} from "y-prosemirror";
import { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import * as Y from "yjs";
import { ProsemirrorBinding } from "y-prosemirror";

export function isRemoteTransaction(tr: Transaction) {
  return tr.getMeta(ySyncPluginKey) !== undefined;
}
type YSyncPluginState = {
  doc: Y.Doc;
  binding: Pick<ProsemirrorBinding, "type" | "mapping">;
};
type RelativePosition = symbol;

/**
 * This class is used to keep track of positions of elements in the editor.
 * It is needed because y-prosemirror's sync plugin can disrupt normal prosemirror position mapping.
 *
 * It is specifically made to be able to be used whether the editor is being used in a collaboratively, or single user, providing the same API.
 */
export class PositionStorage {
  private readonly editor: BlockNoteEditor;
  /**
   * Whether the editor has had a remote transaction.
   */
  private hadRemoteTransaction = false;
  /**
   * A map of an ID to the position mapping.
   */
  private readonly positionMapping = new Map<
    string,
    {
      position: number;
      relativePosition: RelativePosition | undefined;
      mapping: Mapping;
      side: "left" | "right";
    }
  >();

  constructor(editor: BlockNoteEditor) {
    this.editor = editor;
    this.onTransactionHandler = this.onTransactionHandler.bind(this);
  }

  /**
   * Mounts the position storage.
   */
  public mount() {
    this.editor._tiptapEditor.on("transaction", this.onTransactionHandler);

    return this.unmount.bind(this);
  }

  /**
   * Unmounts the position storage.
   */
  public unmount() {
    this.positionMapping.clear();
    this.editor._tiptapEditor.off("transaction", this.onTransactionHandler);
  }

  /**
   * This will be called whenever a transaction is applied to the editor.
   *
   * It's used to update the position mapping or tell if there was a remote transaction.
   */
  private onTransactionHandler({ transaction }: { transaction: Transaction }) {
    console.log("onTransactionHandler", transaction);
    if (this.hadRemoteTransaction) {
      // If we have already had a remote transaction, we rely only on relative positions
      return;
    }

    if (isRemoteTransaction(transaction)) {
      this.hadRemoteTransaction = true;
    } else {
      this.positionMapping.forEach(({ mapping }) => {
        mapping.appendMapping(transaction.mapping);
      });
    }
  }

  /**
   * Stores a position for a given ID. To consistently track the position of an element.
   *
   * @param id An ID to store the position of.
   * @param position The position to store.
   * @param side The side of the position to store.
   */
  public set(id: string, position: number, side?: "left" | "right") {
    const ySyncPluginState = ySyncPluginKey.getState(
      this.editor._tiptapEditor.state
    ) as YSyncPluginState;

    if (!ySyncPluginState) {
      // TODO unsure if this works
      this.positionMapping.set(id, {
        position,
        relativePosition: undefined,
        mapping: new Mapping(),
        side: side ?? "left",
      });
      return this;
    }

    const relativePosition = absolutePositionToRelativePosition(
      // Track the position before the position
      position + (side === "left" ? -1 : 0),
      ySyncPluginState.binding.type,
      ySyncPluginState.binding.mapping
    );

    this.positionMapping.set(id, {
      position,
      relativePosition,
      mapping: new Mapping(),
      side: side ?? "left",
    });

    return this;
  }

  public get(id: string): number {
    const storedPos = this.positionMapping.get(id);

    console.log(storedPos);

    if (!storedPos) {
      throw new Error("No mapping found for id: " + id);
    }

    if (this.hadRemoteTransaction) {
      // If we have had a remote transaction, we need to rely on the relative position
      if (!storedPos.relativePosition) {
        throw new Error("No relative position found for id: " + id);
      }

      const ystate = ySyncPluginKey.getState(
        this.editor._tiptapEditor.state
      ) as YSyncPluginState;
      const rel = relativePositionToAbsolutePosition(
        ystate.doc,
        ystate.binding.type,
        storedPos.relativePosition,
        ystate.binding.mapping
      );

      if (rel === null) {
        // TODO when does this happen?
        return -1;
      }

      return rel + (storedPos.side === "left" ? 1 : -1);
    }

    return (
      storedPos.mapping.map(
        storedPos.position - (storedPos.side === "left" ? 1 : 0),
        storedPos.side === "left" ? -1 : 1
      ) + (storedPos.side === "left" ? 1 : 0)
    );
  }

  public remove(id: string) {
    this.positionMapping.delete(id);

    return this;
  }
}
