import { BlockNoteEditor, EventEmitter } from "@blocknote/core";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

const PLUGIN_KEY = new PluginKey(`blocknote-ai-diff-view`);

export class AIDiffView extends EventEmitter<{
  showDiff: boolean;
}> {
  public readonly plugin: Plugin;
  private editor: BlockNoteEditor<any, any, any>;

  public constructor(editor: BlockNoteEditor<any, any, any>) {
    super();
    this.editor = editor;
    this.plugin = new Plugin<{
      decorations: DecorationSet | null;
    }>({
      key: PLUGIN_KEY,
      state: {
        init() {
          console.log("init plugin state");
          return { decorations: null };
        },
        apply(tr, value, _old, state) {
          console.log("applying tr");
          const shouldShowDiff = tr.getMeta("showDiff") as boolean | undefined;
          if (shouldShowDiff === undefined) {
            return value;
          }

          if (shouldShowDiff) {
            if (!value.decorations) {
              console.log("creating a new one");
              return {
                decorations: DecorationSet.create(state.doc, [
                  // TODO extract the decoration creation
                  // TODO how do we know what position to put the diff view?
                  Decoration.widget(12, (view, getPos) => {
                    const el = document.createElement("div");

                    const leftSide = document.createElement("div");
                    const rightSide = document.createElement("div");

                    el.appendChild(leftSide);
                    el.appendChild(rightSide);
                    el.style.display = "flex";

                    const leftOptions = editor.diffView(
                      editor.document
                    ).options;

                    const leftEditor = BlockNoteEditor.create(leftOptions);
                    leftEditor.mount(leftSide);

                    const rightOptions = editor.diffView(
                      editor.document
                    ).options;

                    const rightEditor = BlockNoteEditor.create(rightOptions);
                    rightEditor.mount(rightSide);

                    rightSide.style.flex = "1";
                    leftSide.style.flex = "1";

                    return el;
                  }),
                ]),
              };
            } else {
              return {
                decorations: value.decorations.map(tr.mapping, tr.doc, {
                  onRemove: () => {
                    alert("did thing");
                  },
                }),
              };
            }
          }

          return {
            decorations: null,
          };
        },
      },
      props: {
        decorations(editorState) {
          const state = this.getState(editorState);

          return state?.decorations ?? undefined;
        },
      },
    });
  }

  // public diffAt(blocks: string[]) {}

  // public showDiff() {
  //   this.editor._tiptapEditor.commands.setMeta("showDiff", true);
  // }

  // public hideDiff() {
  //   this.editor._tiptapEditor.commands.setMeta("showDiff", false);
  // }

  // public onUpdate(cb: () => void) {
  //   this.editor._tiptapEditor.on("transaction", ({ transaction }) => {
  //     if (transaction.getMeta("showDiff") !== undefined) {
  //       cb();
  //     }
  //   });
  // }
}

export function createAIDiffView(editor: BlockNoteEditor<any, any, any>) {
  const diffView = new AIDiffView(editor);
  const ext = Extension.create({
    name: "aiDiffView",
    addProseMirrorPlugins() {
      return [diffView.plugin];
    },
  });

  return ext;
}
