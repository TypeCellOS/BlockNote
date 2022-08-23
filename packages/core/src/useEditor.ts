import { EditorOptions, useEditor as useEditorTiptap } from "@tiptap/react";

import { DependencyList } from "react";
import { getBlockNoteExtensions } from "./BlockNoteExtensions";
import styles from "./editor.module.css";
import rootStyles from "./root.module.css";

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
  options: Partial<BlockNoteEditorOptions> = {},
  deps: DependencyList = []
) => {
  const extensions = options.disableHistoryExtension
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
          rootStyles.bnRoot,
          (options.editorProps?.attributes as any)?.class || "",
        ].join(" "),
      },
    },
  };
  return useEditorTiptap(tiptapOptions, deps);
};
