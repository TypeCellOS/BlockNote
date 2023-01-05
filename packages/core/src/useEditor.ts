import { EditorOptions, useEditor as useEditorTiptap } from "@tiptap/react";

import { DependencyList } from "react";
import { getBlockNoteExtensions } from "./BlockNoteExtensions";
import styles from "./editor.module.css";
import rootStyles from "./root.module.css";
import { MenuFactories } from "./BlockNoteEditor";

type BlockNoteEditorOptions = EditorOptions & {
  enableBlockNoteExtensions: boolean;
  disableHistoryExtension: boolean;
};

const blockNoteExtensions = getBlockNoteExtensions();

const blockNoteOptions = {
  enableInputRules: true,
  enablePasteRules: true,
  enableCoreExtensions: false,
};

/**
 * Main hook for importing a BlockNote editor into a react project
 */
export const useEditor = (
  menuFactories: MenuFactories,
  options: Partial<BlockNoteEditorOptions> = {},
  deps: DependencyList = []
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
  return useEditorTiptap(tiptapOptions, deps);
};
