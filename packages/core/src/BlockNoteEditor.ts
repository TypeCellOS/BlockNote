import { Editor, EditorOptions } from "@tiptap/core";

import { getBlockNoteExtensions } from "./BlockNoteExtensions";
import styles from "./editor.module.css";
import { BubbleMenuFactory } from "./extensions/BubbleMenu/BubbleMenuFactoryTypes";
import { HyperlinkHoverMenuFactory } from "./extensions/Hyperlinks/HyperlinkMenuFactoryTypes";
import { SuggestionsMenuFactory } from "./shared/plugins/suggestion/SuggestionsMenuFactoryTypes";
import rootStyles from "./root.module.css";
import { SuggestionItem } from "./shared/plugins/suggestion/SuggestionItem";

type BlockNoteEditorOptions = EditorOptions & {
  enableBlockNoteExtensions: boolean;
  disableHistoryExtension: boolean;
};

export type MenuFactories = {
  bubbleMenuFactory: BubbleMenuFactory;
  hyperlinkMenuFactory: HyperlinkHoverMenuFactory;
  suggestionsMenuFactory: SuggestionsMenuFactory<SuggestionItem>;
};

const blockNoteExtensions = getBlockNoteExtensions();

const blockNoteOptions = {
  enableInputRules: true,
  enablePasteRules: true,
  enableCoreExtensions: false,
};

export const mountBlockNoteEditor = (
  menuFactories: MenuFactories,
  options: Partial<BlockNoteEditorOptions> = {}
) => {
  let extensions = options.disableHistoryExtension
    ? blockNoteExtensions.filter((e) => e.name !== "history")
    : blockNoteExtensions;

  // TODO: review
  extensions = extensions.map((extension) => {
    if (extension.name === "BubbleMenuExtension") {
      return extension.configure({
        bubbleMenuFactory: menuFactories.bubbleMenuFactory,
      });
    }

    if (extension.name === "link") {
      return extension.configure({
        hyperlinkMenuFactory: menuFactories.hyperlinkMenuFactory,
      });
    }

    if (extension.name === "slash-command") {
      return extension.configure({
        suggestionsMenuFactory: menuFactories.suggestionsMenuFactory,
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
          rootStyles.bnRoot,
          (options.editorProps?.attributes as any)?.class || "",
        ].join(" "),
      },
    },
  };

  return new Editor(tiptapOptions);
};
