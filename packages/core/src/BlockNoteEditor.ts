import { Editor, EditorOptions } from "@tiptap/core";

import { getBlockNoteExtensions } from "./BlockNoteExtensions";
import styles from "./editor.module.css";
import { BubbleMenuFactory } from "./extensions/BubbleMenu/BubbleMenuFactoryTypes";
import {
  AddBlockButtonFactory,
  DragHandleFactory,
  DragHandleMenuFactory,
} from "./extensions/DraggableBlocks/DragMenuFactoryTypes";
import { HyperlinkMenuFactory } from "./extensions/Hyperlinks/HyperlinkMenuFactoryTypes";
import { SuggestionItem } from "./shared/plugins/suggestion/SuggestionItem";
import { SuggestionsMenuFactory } from "./shared/plugins/suggestion/SuggestionsMenuFactoryTypes";

export type BlockNoteEditorOptions = EditorOptions & {
  enableBlockNoteExtensions: boolean;
  disableHistoryExtension: boolean;
  uiFactories: {
    bubbleMenuFactory: BubbleMenuFactory;
    hyperlinkMenuFactory: HyperlinkMenuFactory;
    suggestionsMenuFactory: SuggestionsMenuFactory<SuggestionItem>;
    addBlockButtonFactory: AddBlockButtonFactory;
    dragHandleFactory: DragHandleFactory;
    dragHandleMenuFactory: DragHandleMenuFactory;
  };
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
        extension.name === "BubbleMenuExtension" &&
        options.uiFactories?.bubbleMenuFactory
      ) {
        return extension.configure({
          bubbleMenuFactory: options.uiFactories.bubbleMenuFactory,
        });
      }

      if (
        extension.name === "link" &&
        options.uiFactories?.hyperlinkMenuFactory
      ) {
        return extension.configure({
          hyperlinkMenuFactory: options.uiFactories.hyperlinkMenuFactory,
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
          addBlockButtonFactory: options.uiFactories.addBlockButtonFactory,
          dragHandleFactory: options.uiFactories.dragHandleFactory,
          dragHandleMenuFactory: options.uiFactories.dragHandleMenuFactory,
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
