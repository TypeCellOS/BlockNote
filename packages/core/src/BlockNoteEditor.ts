import { Editor, EditorOptions } from "@tiptap/core";

// import "./blocknote.css";
import { getBlockNoteExtensions } from "./BlockNoteExtensions";
import styles from "./editor.module.css";
import { FormattingToolbarFactory } from "./extensions/FormattingToolbar/FormattingToolbarFactoryTypes";
import { BlockSideMenuFactory } from "./extensions/DraggableBlocks/BlockSideMenuFactoryTypes";
import { HyperlinkToolbarFactory } from "./extensions/HyperlinkToolbar/HyperlinkToolbarFactoryTypes";
import { SuggestionItem } from "./shared/plugins/suggestion/SuggestionItem";
import { SuggestionsMenuFactory } from "./shared/plugins/suggestion/SuggestionsMenuFactoryTypes";

export type BlockNoteEditorOptions = EditorOptions & {
  enableBlockNoteExtensions: boolean;
  disableHistoryExtension: boolean;
  uiFactories: Partial<{
    formattingToolbarFactory: FormattingToolbarFactory;
    hyperlinkToolbarFactory: HyperlinkToolbarFactory;
    suggestionsMenuFactory: SuggestionsMenuFactory<SuggestionItem>;
    blockSideMenuFactory: BlockSideMenuFactory;
  }>;
};

const blockNoteExtensions = getBlockNoteExtensions();

const blockNoteOptions = {
  enableInputRules: true,
  enablePasteRules: true,
  enableCoreExtensions: false,
};

export class BlockNoteEditor {
  public readonly tiptapEditor: Editor & { contentComponent: any };

  constructor(options: Partial<BlockNoteEditorOptions> = {}) {
    let extensions = options.disableHistoryExtension
      ? blockNoteExtensions.filter((e) => e.name !== "history")
      : blockNoteExtensions;

    // TODO: review
    extensions = extensions.map((extension) => {
      if (
        extension.name === "FormattingToolbarExtension" &&
        options.uiFactories?.formattingToolbarFactory
      ) {
        return extension.configure({
          formattingToolbarFactory:
            options.uiFactories.formattingToolbarFactory,
        });
      }

      if (
        extension.name === "link" &&
        options.uiFactories?.hyperlinkToolbarFactory
      ) {
        return extension.configure({
          hyperlinkToolbarFactory: options.uiFactories.hyperlinkToolbarFactory,
        });
      }

      if (
        extension.name === "slash-command" &&
        options.uiFactories?.suggestionsMenuFactory
      ) {
        return extension.configure({
          suggestionsMenuFactory: options.uiFactories.suggestionsMenuFactory,
        });
      }

      if (
        extension.name === "DraggableBlocksExtension" &&
        options.uiFactories
      ) {
        return extension.configure({
          blockSideMenuFactory: options.uiFactories.blockSideMenuFactory,
        });
      }

      return extension;
    });

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
