import { Editor, EditorOptions } from "@tiptap/core";

// import "./blocknote.css";
import { Editor as EditorAPI } from "./api/Editor";
import { getBlockNoteExtensions, UiFactories } from "./BlockNoteExtensions";
import styles from "./editor.module.css";
import { defaultSlashCommands, SlashCommand } from "./extensions/SlashMenu";

export type BlockNoteEditorOptions = {
  // TODO: Figure out if enableBlockNoteExtensions/disableHistoryExtension are needed and document them.
  enableBlockNoteExtensions: boolean;
  disableHistoryExtension: boolean;
  uiFactories: UiFactories;
  slashCommands: SlashCommand[];
  parentElement: HTMLElement;
  editorDOMAttributes: Record<string, string>;
  onUpdate: (editor: BlockNoteEditor) => void;
  onCreate: (editor: BlockNoteEditor) => void;

  // tiptap options, undocumented
  _tiptapOptions: any;
};

const blockNoteTipTapOptions = {
  enableInputRules: true,
  enablePasteRules: true,
  enableCoreExtensions: false,
};

export class BlockNoteEditor extends EditorAPI {
  public readonly _tiptapEditor: Editor & { contentComponent: any };

  public get domElement() {
    return this._tiptapEditor.view.dom as HTMLDivElement;
  }

  constructor(options: Partial<BlockNoteEditorOptions> = {}) {
    const blockNoteExtensions = getBlockNoteExtensions({
      uiFactories: options.uiFactories || {},
      slashCommands: options.slashCommands || defaultSlashCommands,
    });

    let extensions = options.disableHistoryExtension
      ? blockNoteExtensions.filter((e) => e.name !== "history")
      : blockNoteExtensions;

    const tiptapOptions: EditorOptions = {
      ...blockNoteTipTapOptions,
      ...options._tiptapOptions,
      onUpdate: () => {
        options.onUpdate?.(this);
      },
      onCreate: () => {
        options.onCreate?.(this);
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
