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

type RelativePosition = symbol;

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
   * @param side The side of the position to store. "left" is the default. "right" would move with the change if the change is in the right direction.
   */
  public set(id: string, position: number, side?: "left" | "right") {
    const ySyncPluginState = ySyncPluginKey.getState(
      this.editor._tiptapEditor.state
    ) as YSyncPluginState;

    if (!ySyncPluginState) {
      this.positionMapping.set(id, {
        position,
        relativePosition: undefined,
        mapping: new Mapping(),
        side: side ?? "left",
      });
      return this;
    }

    const relativePosition = absolutePositionToRelativePosition(
      // Track the position after the position if we are on the right side
      position + (side === "right" ? 1 : 0),
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

  public get(id: string): number | undefined {
    const storedPos = this.positionMapping.get(id);

    if (!storedPos) {
      return undefined;
    }

    if (this.hadRemoteTransaction) {
      // If we have had a remote transaction, we need to rely on the relative position
      if (!storedPos.relativePosition) {
        return undefined;
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

      // This can happen if the element is deleted
      if (rel === null) {
        return undefined;
      }

      return rel + (storedPos.side === "right" ? -1 : 0);
    }

    return storedPos.mapping.map(
      storedPos.position,
      storedPos.side === "left" ? -1 : 1
    );
  }

  public remove(id: string) {
    this.positionMapping.delete(id);

    return this;
  }
}
