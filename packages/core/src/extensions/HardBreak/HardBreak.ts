// Stripped down version of the TipTap HardBreak extension:
// https://github.com/ueberdosis/tiptap/blob/f3258d9ee5fb7979102fe63434f6ea4120507311/packages/extension-hard-break/src/hard-break.ts#L80
// Changes:
// - Removed options
// - Removed keyboard shortcuts & moved them to the `KeyboardShortcutsExtension`
// - Removed `setHardBreak` command (added a simpler version in the Shift+Enter
// handler in `KeyboardShortcutsExtension`).
// - Added priority
import { mergeAttributes, Node } from "@tiptap/core";

export const HardBreak = Node.create({
  name: "hardBreak",

  inline: true,

  group: "inline",

  selectable: false,

  linebreakReplacement: true,

  priority: 10,

  parseHTML() {
    return [{ tag: "br" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["br", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  renderText() {
    return "\n";
  },
});
