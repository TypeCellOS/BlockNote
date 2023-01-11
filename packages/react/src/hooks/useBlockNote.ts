import { BlockNoteEditor, BlockNoteEditorOptions } from "@blocknote/core";
import { DependencyList, useEffect, useState } from "react";
import { ReactAddBlockButtonFactory } from "../AddBlockButton/AddBlockButtonFactory";
import { ReactBubbleMenuFactory } from "../BubbleMenu/BubbleMenuFactory";
import { ReactDragHandleFactory } from "../DragHandle/DragHandleFactory";
import { ReactDragHandleMenuFactory } from "../DragHandleMenu/DragHandleMenuFactory";
import { ReactHyperlinkMenuFactory } from "../HyperlinkMenu/HyperlinkMenuFactory";
import { ReactSuggestionsMenuFactory } from "../SuggestionsMenu/SuggestionsMenuFactory";

//based on https://github.com/ueberdosis/tiptap/blob/main/packages/react/src/useEditor.ts

function useForceUpdate() {
  const [, setValue] = useState(0);

  return () => setValue((value) => value + 1);
}

/**
 * Main hook for importing a BlockNote editor into a react project
 */
export const useBlockNote = (
  options: Partial<BlockNoteEditorOptions> = {},
  deps: DependencyList = []
) => {
  const [editor, setEditor] = useState<BlockNoteEditor | null>();
  const forceUpdate = useForceUpdate();
  // useEditorForceUpdate(editor.tiptapEditor);

  useEffect(() => {
    let isMounted = true;
    let newOptions = { ...options };
    if (!newOptions.uiFactories) {
      newOptions = {
        ...newOptions,
        uiFactories: {
          bubbleMenuFactory: ReactBubbleMenuFactory,
          hyperlinkMenuFactory: ReactHyperlinkMenuFactory,
          suggestionsMenuFactory: ReactSuggestionsMenuFactory,
          addBlockButtonFactory: ReactAddBlockButtonFactory,
          dragHandleFactory: ReactDragHandleFactory,
          dragHandleMenuFactory: ReactDragHandleMenuFactory,
        },
      };
    }
    console.log("create new blocknote instance");
    const instance = new BlockNoteEditor(newOptions);

    setEditor(instance);

    instance.tiptapEditor.on("transaction", () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (isMounted) {
            forceUpdate();
          }
        });
      });
    });

    return () => {
      instance.tiptapEditor.destroy();
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return editor;
};
