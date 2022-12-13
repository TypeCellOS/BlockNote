import { Editor, EditorOptions } from "@tiptap/core";

import { getBlockNoteExtensions } from "./BlockNoteExtensions";
import styles from "./editor.module.css";
import rootStyles from "./root.module.css";

type BlockNoteEditorOptions = EditorOptions & {
  enableBlockNoteExtensions: boolean;
  disableHistoryExtension: boolean;
};

export type menuFactoriesType = {
  bubbleMenuFactory: (editor: Editor) => HTMLElement;
  hyperlinkMenuFactory: (
    editor: Editor,
    url: string,
    text: string,
    update: (url: string, text: string) => void,
    remove: () => void
  ) => HTMLElement;
};

const blockNoteExtensions = getBlockNoteExtensions();

const blockNoteOptions = {
  enableInputRules: true,
  enablePasteRules: true,
  enableCoreExtensions: false,
};

export const mountBlockNoteEditor = (
  menuFactories: menuFactoriesType,
  options: Partial<BlockNoteEditorOptions> = {}
) => {
  let extensions = options.disableHistoryExtension
    ? blockNoteExtensions.filter((e) => e.name !== "history")
    : blockNoteExtensions;

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
