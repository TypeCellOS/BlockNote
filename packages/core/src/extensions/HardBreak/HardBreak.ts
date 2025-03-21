// Stripped down version of the TipTap HardBreak extension:
// https://github.com/ueberdosis/tiptap/blob/f3258d9ee5fb7979102fe63434f6ea4120507311/packages/extension-hard-break/src/hard-break.ts#L80
// Changes:
// - Removed options
// - Removed keyboard shortcuts & moved them to the `KeyboardShortcutsExtension`
// - Removed `setHardBreak` check if parent node is isolating (this is beacuse
// custom blocks are isolating).
// - Added priority
import { mergeAttributes, Node } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    hardBreak: {
      /**
       * Add a hard break
       * @example editor.commands.setHardBreak()
       */
      setHardBreak: () => ReturnType;
    };
  }
}

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

  addCommands() {
    return {
      setHardBreak:
        () =>
        ({ commands, chain, state, editor }) => {
          return commands.first([
            () => commands.exitCode(),
            () =>
              commands.command(() => {
                const { selection, storedMarks } = state;

                const { keepMarks } = this.options;
                const { splittableMarks } = editor.extensionManager;
                const marks =
                  storedMarks ||
                  (selection.$to.parentOffset && selection.$from.marks());

                return chain()
                  .insertContent({ type: this.name })
                  .command(({ tr, dispatch }) => {
                    if (dispatch && marks && keepMarks) {
                      const filteredMarks = marks.filter((mark) =>
                        splittableMarks.includes(mark.type.name)
                      );

                      tr.ensureMarks(filteredMarks);
                    }

                    return true;
                  })
                  .run();
              }),
          ]);
        },
    };
  },
});
