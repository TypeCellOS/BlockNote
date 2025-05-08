import { Plugin } from "prosemirror-state";
import { yUndoPlugin } from "y-prosemirror";

export class UndoPlugin {
  public plugin: Plugin;

  constructor() {
    this.plugin = yUndoPlugin();
  }

  public get priority() {
    return 1000;
  }
}
