import { Editor, EditorOptions } from "@tiptap/core";

// import "./blocknote.css";
import { Editor as EditorAPI } from "./api/Editor";
import { getBlockNoteExtensions, UiFactories } from "./BlockNoteExtensions";
import styles from "./editor.module.css";
import { SlashCommand } from "./extensions/SlashMenu";
import { defaultSlashCommands } from "./extensions/SlashMenu";

export type BlockNoteEditorOptions = {
  enableBlockNoteExtensions: boolean;
  disableHistoryExtension: boolean;
  uiFactories: UiFactories;
  slashCommands: SlashCommand[];
  element: HTMLElement;
  editorDOMAttributes: Record<string, string>;
  onUpdate: () => void;
  onCreate: () => void;

  // tiptap options, undocumented
  _tiptapOptions: any;
};

const blockNoteOptions = {
  enableInputRules: true,
  enablePasteRules: true,
  enableCoreExtensions: false,
};

export class BlockNoteEditor extends EditorAPI {
  public readonly _tiptapEditor: Editor & { contentComponent: any };

  constructor(options: Partial<BlockNoteEditorOptions> = {}) {
    const blockNoteExtensions = getBlockNoteExtensions({
      uiFactories: options.uiFactories || {},
      slashCommands: options.slashCommands || defaultSlashCommands,
    });

    let extensions = options.disableHistoryExtension
      ? blockNoteExtensions.filter((e) => e.name !== "history")
      : blockNoteExtensions;

    const tiptapOptions: EditorOptions = {
      ...blockNoteOptions,
      ...options._tiptapOptions,
      onUpdate: () => {
        options.onUpdate?.();
      },
      onCreate: () => {
        options.onCreate?.();
      },
      extensions:
        options.enableBlockNoteExtensions === false
          ? options._tiptapOptions?.extensions
          : [...(options._tiptapOptions?.extensions || []), ...extensions],
      editorProps: {
        attributes: {
          ...(options.editorDOMAttributes || {}),
          class: [
            styles.bnEditor,
            styles.bnRoot,
            options.editorDOMAttributes?.class || "",
          ].join(" "),
        },
      },
    };

    const _tiptapEditor = new Editor(tiptapOptions) as Editor & {
      contentComponent: any;
    };
    super(_tiptapEditor);
    this._tiptapEditor = _tiptapEditor;
  }
}
