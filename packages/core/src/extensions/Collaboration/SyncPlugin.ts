import { Plugin } from "prosemirror-state";
import { ySyncPlugin } from "y-prosemirror";
import type * as Y from "yjs";

export class SyncPlugin {
  public plugin: Plugin;

  constructor(fragment: Y.XmlFragment) {
    this.plugin = ySyncPlugin(fragment);
  }

  public get priority() {
    return 1001;
  }
}
