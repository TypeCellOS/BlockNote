import {
  BlockNoteEditor,
  BlockNoteEditorOptions,
  EventEmitter,
} from "@blocknote/core";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { callLLM } from "../api/formats/json/json";

const PLUGIN_KEY = new PluginKey(`blocknote-ai-diff-view`);

type DiffEditorView = {
  left: BlockNoteEditor<any, any, any>;
  right: BlockNoteEditor<any, any, any>;
};

export class AIDiffView extends EventEmitter<{
  addDiffView: DiffEditorView;
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
          return { decorations: null };
        },
        apply: (tr, value, _old, state) => {
          const diffId = tr.getMeta(PLUGIN_KEY) as string | undefined;
          if (diffId === undefined) {
            return value;
          }

          if (diffId) {
            if (!value.decorations) {
              return {
                decorations: DecorationSet.create(state.doc, [
                  // TODO extract the decoration creation
                  // TODO how do we know what position to put the diff view?
                  Decoration.widget(
                    0,
                    () => {
                      const el = document.createElement("div");

                      const leftSide = document.createElement("div");
                      const rightSide = document.createElement("div");

                      el.appendChild(leftSide);
                      el.appendChild(rightSide);
                      el.style.display = "flex";

                      const blocks = editor.document.map((blockId) => {
                        return editor.getBlock(blockId)!;
                      });
                      const leftOptions: Partial<
                        BlockNoteEditorOptions<any, any, any>
                      > = {
                        ...editor.options,
                        initialContent: blocks,
                      };

                      const leftEditor = BlockNoteEditor.create(leftOptions);
                      leftEditor.mount(leftSide);

                      const rightOptions: Partial<
                        BlockNoteEditorOptions<any, any, any>
                      > = {
                        ...editor.options,
                        // initialContent: [],
                      };

                      const rightEditor = BlockNoteEditor.create(rightOptions);
                      rightEditor.mount(rightSide);

                      rightSide.style.flex = "1";
                      rightSide.style.minWidth = "0";
                      leftSide.style.flex = "1";
                      leftSide.style.minWidth = "0";

                      this.instances.set(diffId, {
                        left: leftEditor,
                        right: rightEditor,
                      });

                      return el;
                    },
                    {
                      key: diffId,
                    }
                  ),
                ]),
              };
            } else {
              return {
                decorations: value.decorations.map(tr.mapping, tr.doc),
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

  public instances = new Map<
    string,
    {
      left: BlockNoteEditor<any, any, any>;
      right: BlockNoteEditor<any, any, any>;
    }
  >();

  public showDiff(id = Math.random().toString(16).slice(2)) {
    this.editor._tiptapEditor.commands.setMeta(PLUGIN_KEY, id);
  }

  public hideDiff(id: string) {
    this.editor._tiptapEditor.commands.setMeta(PLUGIN_KEY, id);
  }

  public startLLM() {}

  // public onUpdate(cb: () => void) {
  //   this.editor._tiptapEditor.on("transaction", ({ transaction }) => {
  //     if (transaction.getMeta(PLUGIN_KEY) !== undefined) {
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
