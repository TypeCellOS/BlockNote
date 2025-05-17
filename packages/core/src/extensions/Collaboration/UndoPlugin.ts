import { yUndoPlugin } from "y-prosemirror";
import { BlockNoteExtension } from "../../editor/BlockNoteExtension.js";

export class UndoPlugin extends BlockNoteExtension {
  constructor() {
    super();
    this.addProsemirrorPlugin(yUndoPlugin());
  }

  public get priority() {
    return 1000;
  }
}
