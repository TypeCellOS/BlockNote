import { Editor, EditorOptions } from "@tiptap/core";

// import "./blocknote.css";
import { Editor as EditorAPI } from "./api/Editor";
import { getBlockNoteExtensions, UiFactories } from "./BlockNoteExtensions";
import styles from "./editor.module.css";
import { SlashCommand } from "./extensions/SlashMenu";
import { defaultSlashCommands } from "./extensions/SlashMenu/defaultSlashCommands";

export type BlockNoteEditorOptions = EditorOptions & {
  enableBlockNoteExtensions: boolean;
  disableHistoryExtension: boolean;
  uiFactories: UiFactories;
  slashCommands: SlashCommand[];
};

const blockNoteOptions = {
  enableInputRules: true,
  enablePasteRules: true,
  enableCoreExtensions: false,
};

// TODO: clean tiptap api
export class BlockNoteEditor {
  public readonly tiptapEditor: Editor & { contentComponent: any };
  // TODO: design where to put this
  public readonly api: EditorAPI;

  constructor(options: Partial<BlockNoteEditorOptions> = {}) {
    const blockNoteExtensions = getBlockNoteExtensions({
      uiFactories: options.uiFactories || {},
      slashCommands: options.slashCommands || defaultSlashCommands,
    });

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
    this.api = new EditorAPI(this.tiptapEditor);
  }
}
