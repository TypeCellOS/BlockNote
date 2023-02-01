import { Editor, EditorOptions } from "@tiptap/core";

// import "./blocknote.css";
import { getBlockNoteExtensions, UiFactories } from "./BlockNoteExtensions";
import styles from "./editor.module.css";

export type BlockNoteEditorOptions = EditorOptions & {
  enableBlockNoteExtensions: boolean;
  disableHistoryExtension: boolean;
  uiFactories: UiFactories;
};

const blockNoteOptions = {
  enableInputRules: true,
  enablePasteRules: true,
  enableCoreExtensions: false,
};

export class BlockNoteEditor {
  public readonly tiptapEditor: Editor & { contentComponent: any };

  constructor(options: Partial<BlockNoteEditorOptions> = {}) {
    const blockNoteExtensions = getBlockNoteExtensions(
      options.uiFactories || {}
    );

    let extensions = options.disableHistoryExtension
      ? blockNoteExtensions.filter((e) => e.name !== "history")
      : blockNoteExtensions;

    const tiptapOptions = {
      ...blockNoteOptions,
      ...options,
      extensions:
        options.enableBlockNoteExtensions === false
          ? options.extensions
          : [...(options.extensions || []), ...extensions],
      editorProps: {
        attributes: {
          ...(options.editorProps?.attributes || {}),
          class: [
            styles.bnEditor,
            styles.bnRoot,
            (options.editorProps?.attributes as any)?.class || "",
          ].join(" "),
        },
      },
    };

    this.tiptapEditor = new Editor(tiptapOptions) as Editor & {
      contentComponent: any;
    };
  }
}
