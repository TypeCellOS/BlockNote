import { ySyncPlugin } from "y-prosemirror";
import type * as Y from "yjs";
import { BlockNoteExtension } from "../../editor/BlockNoteExtension.js";

export class SyncPlugin extends BlockNoteExtension {
  public static key() {
    return "ySyncPlugin";
  }

  constructor(fragment: Y.XmlFragment) {
    super();
    this.addProsemirrorPlugin(ySyncPlugin(fragment));
  }

  public get priority() {
    return 1001;
  }
}
