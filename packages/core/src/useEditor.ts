import { useEditor as useEditorTiptap, EditorOptions } from "@tiptap/react";

import { DependencyList } from "react";
import { getBlockNoteExtensions } from "./BlockNoteExtensions";
import styles from "./editor.module.css";

type BlockNoteEditorOptions = EditorOptions & {
  enableBlockNoteExtensions: boolean;
};

const blockNoteExtensions = getBlockNoteExtensions();

const blockNoteOptions = {
  enableInputRules: true,
  enablePasteRules: true,
  enableCoreExtensions: false,
};
export const useEditor = (
  options: Partial<BlockNoteEditorOptions> = {},
  deps: DependencyList = []
) => {
  const tiptapOptions = {
    ...blockNoteOptions,
    ...options,
    extensions:
      options.enableBlockNoteExtensions === false
        ? options.extensions
        : [...(options.extensions || []), ...blockNoteExtensions],
    editorProps: {
      attributes: {
        class:
          styles.bnEditor +
          " " +
          ((options.editorProps?.attributes as any)?.class || ""),
      },
    },
  };
  return useEditorTiptap(tiptapOptions, deps);
};
