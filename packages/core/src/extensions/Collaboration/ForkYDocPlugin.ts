import * as Y from "yjs";

import {
  yCursorPluginKey,
  ySyncPluginKey,
  yUndoPluginKey,
} from "y-prosemirror";
import { CursorPlugin } from "./CursorPlugin.js";
import { SyncPlugin } from "./SyncPlugin.js";
import { UndoPlugin } from "./UndoPlugin.js";

import {
  BlockNoteEditor,
  BlockNoteEditorOptions,
} from "../../editor/BlockNoteEditor.js";
import { BlockNoteExtension } from "../../editor/BlockNoteExtension.js";

export class ForkYDocPlugin extends BlockNoteExtension<{
  forked: boolean;
}> {
  public static key() {
    return "ForkYDocPlugin";
  }

  private editor: BlockNoteEditor<any, any, any>;
  private collaboration: BlockNoteEditorOptions<any, any, any>["collaboration"];

  constructor({
    editor,
    collaboration,
  }: {
    editor: BlockNoteEditor<any, any, any>;
    collaboration: BlockNoteEditorOptions<any, any, any>["collaboration"];
  }) {
    super(editor);
    this.editor = editor;
    this.collaboration = collaboration;
  }

  /**
   * To find a fragment in another ydoc, we need to search for it.
   */
  private findTypeInOtherYdoc<T extends Y.AbstractType<any>>(
    ytype: T,
    otherYdoc: Y.Doc,
  ): T {
    const ydoc = ytype.doc!;
    if (ytype._item === null) {
      /**
       * If is a root type, we need to find the root key in the original ydoc
       * and use it to get the type in the other ydoc.
       */
      const rootKey = Array.from(ydoc.share.keys()).find(
        (key) => ydoc.share.get(key) === ytype,
      );
      if (rootKey == null) {
        throw new Error("type does not exist in other ydoc");
      }
      return otherYdoc.get(rootKey, ytype.constructor as new () => T) as T;
    } else {
      /**
       * If it is a sub type, we use the item id to find the history type.
       */
      const ytypeItem = ytype._item;
      const otherStructs =
        otherYdoc.store.clients.get(ytypeItem.id.client) ?? [];
      const itemIndex = Y.findIndexSS(otherStructs, ytypeItem.id.clock);
      const otherItem = otherStructs[itemIndex] as Y.Item;
      const otherContent = otherItem.content as Y.ContentType;
      return otherContent.type as T;
    }
  }

  /**
   * Whether the editor is editing a forked document,
   * preserving a reference to the original document and the forked document.
   */
  public get isForkedFromRemote() {
    return this.forkedState !== undefined;
  }

  /**
   * Stores whether the editor is editing a forked document,
   * preserving a reference to the original document and the forked document.
   */
  private forkedState:
    | {
        originalFragment: Y.XmlFragment;
        undoStack: Y.UndoManager["undoStack"];
        forkedFragment: Y.XmlFragment;
      }
    | undefined;

  /**
   * Fork the Y.js document from syncing to the remote,
   * allowing modifications to the document without affecting the remote.
   * These changes can later be rolled back or applied to the remote.
   */
  public fork() {
    if (this.isForkedFromRemote) {
      return;
    }

    const originalFragment = this.collaboration?.fragment;

    if (!originalFragment) {
      throw new Error("No fragment to fork from");
    }

    const doc = new Y.Doc();
    // Copy the original document to a new Yjs document
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(originalFragment.doc!));

    // Find the forked fragment in the new Yjs document
    const forkedFragment = this.findTypeInOtherYdoc(originalFragment, doc);

    this.forkedState = {
      undoStack: yUndoPluginKey.getState(this.editor.prosemirrorState)!
        .undoManager.undoStack,
      originalFragment,
      forkedFragment,
    };

    // Need to reset all the yjs plugins
    this.editor._tiptapEditor.unregisterPlugin([
      yCursorPluginKey,
      yUndoPluginKey,
      ySyncPluginKey,
    ]);
    // Register them again, based on the new forked fragment
    this.editor._tiptapEditor.registerPlugin(
      new SyncPlugin(forkedFragment).plugins[0],
    );
    this.editor._tiptapEditor.registerPlugin(
      new UndoPlugin({ editor: this.editor }).plugins[0],
    );
    // No need to register the cursor plugin again, it's a local fork
    this.emit("forked", true);
  }

  /**
   * Resume syncing the Y.js document to the remote
   * If `keepChanges` is true, any changes that have been made to the forked document will be applied to the original document.
   * Otherwise, the original document will be restored and the changes will be discarded.
   */
  public merge({ keepChanges }: { keepChanges: boolean }) {
    if (!this.forkedState) {
      return;
    }
    // Remove the forked fragment's plugins
    this.editor._tiptapEditor.unregisterPlugin(ySyncPluginKey);
    this.editor._tiptapEditor.unregisterPlugin(yUndoPluginKey);

    const { originalFragment, forkedFragment, undoStack } = this.forkedState;
    this.editor.extensions["ySyncPlugin"] = new SyncPlugin(originalFragment);
    this.editor.extensions["yCursorPlugin"] = new CursorPlugin(
      this.collaboration!,
    );
    this.editor.extensions["yUndoPlugin"] = new UndoPlugin({
      editor: this.editor,
    });

    // Register the plugins again, based on the original fragment
    this.editor._tiptapEditor.registerPlugin(
      this.editor.extensions["ySyncPlugin"].plugins[0],
    );
    this.editor._tiptapEditor.registerPlugin(
      this.editor.extensions["yCursorPlugin"].plugins[0],
    );
    this.editor._tiptapEditor.registerPlugin(
      this.editor.extensions["yUndoPlugin"].plugins[0],
    );

    // Reset the undo stack to the original undo stack
    yUndoPluginKey.getState(
      this.editor.prosemirrorState,
    )!.undoManager.undoStack = undoStack;

    if (keepChanges) {
      // Apply any changes that have been made to the fork, onto the original doc
      const update = Y.encodeStateAsUpdate(
        forkedFragment.doc!,
        Y.encodeStateVector(originalFragment.doc!),
      );
      // Applying this change will add to the undo stack, allowing it to be undone normally
      Y.applyUpdate(originalFragment.doc!, update, this.editor);
    }
    // Reset the forked state
    this.forkedState = undefined;
    this.emit("forked", false);
  }
}
