import { Extension } from "@tiptap/core";
import { DropCursorPlugin } from "./DropCursorPlugin";

// Adapted from https://github.com/ueberdosis/tiptap/blob/develop/packages/extension-dropcursor/src/dropcursor.ts

export interface DropCursorOptions {
  color: string | undefined;
  width: number | undefined;
  class: string | undefined;
}

export const DropCursor = Extension.create<DropCursorOptions>({
  name: "DropCursor",

  addOptions() {
    return {
      color: "currentColor",
      width: 1,
      class: undefined,
    };
  },

  addProseMirrorPlugins() {
    return [DropCursorPlugin(this.options)];
  },
});
