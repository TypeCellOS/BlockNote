import { Editor, EditorOptions } from "@tiptap/core";

// import "./blocknote.css";
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

export class BlockNoteEditor {
  public readonly tiptapEditor: Editor & { contentComponent: any };

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
  }
}
