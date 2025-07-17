import { yUndoPlugin } from "y-prosemirror";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { BlockNoteExtension } from "../../editor/BlockNoteExtension.js";

export class UndoPlugin extends BlockNoteExtension {
  public static key() {
    return "yUndoPlugin";
  }

  constructor({ editor }: { editor: BlockNoteEditor<any, any, any> }) {
    super();
    this.addProsemirrorPlugin(yUndoPlugin({ trackedOrigins: [editor] }));
  }

  public get priority() {
    return 1000;
  }
}
