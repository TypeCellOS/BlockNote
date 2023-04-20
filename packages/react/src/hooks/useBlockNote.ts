import { BlockNoteEditor, BlockNoteEditorOptions } from "@blocknote/core";
import { DependencyList, useEffect, useState } from "react";
import { createReactBlockSideMenuFactory } from "../BlockSideMenu/BlockSideMenuFactory";
import { createReactFormattingToolbarFactory } from "../FormattingToolbar/FormattingToolbarFactory";
import { createReactHyperlinkToolbarFactory } from "../HyperlinkToolbar/HyperlinkToolbarFactory";
import { createReactSlashMenuFactory } from "../SlashMenu/SlashMenuFactory";
import { defaultReactSlashMenuItems } from "../SlashMenu/defaultReactSlashMenuItems";
import { getBlockNoteTheme } from "../BlockNoteTheme";
//based on https://github.com/ueberdosis/tiptap/blob/main/packages/react/src/useEditor.ts

function useForceUpdate() {
  const [, setValue] = useState(0);

  return () => setValue((value) => value + 1);
}

/**
 * Main hook for importing a BlockNote editor into a React project
 */
export const useBlockNote = (
  options: Partial<BlockNoteEditorOptions> = {},
  deps: DependencyList = []
) => {
  const [editor, setEditor] = useState<BlockNoteEditor | null>(null);
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    let isMounted = true;
    // TODO: Fix typing. UiFactories expects only BaseSlashMenuItems, not extended types. Can be fixed with a generic,
    //  but it would have to be on several different classes (BlockNoteEditor, BlockNoteEditorOptions, UiFactories) and
    //  gets messy quick.
    let newOptions: Record<any, any> = {
      slashCommands: defaultReactSlashMenuItems,
      ...options,
    };
    if (!newOptions.uiFactories) {
      newOptions = {
        ...newOptions,
        uiFactories: {
          formattingToolbarFactory: createReactFormattingToolbarFactory(
            getBlockNoteTheme(newOptions.theme === "dark")
          ),
          hyperlinkToolbarFactory: createReactHyperlinkToolbarFactory(
            getBlockNoteTheme(newOptions.theme === "dark")
          ),
          slashMenuFactory: createReactSlashMenuFactory(
            getBlockNoteTheme(newOptions.theme === "dark")
          ),
          blockSideMenuFactory: createReactBlockSideMenuFactory(
            getBlockNoteTheme(newOptions.theme === "dark")
          ),
        },
      };
    }
    console.log("create new blocknote instance");
    const instance = new BlockNoteEditor(
      newOptions as Partial<BlockNoteEditorOptions>
    );

    setEditor(instance);

    instance._tiptapEditor.on("transaction", () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (isMounted) {
            forceUpdate();
          }
        });
      });
    });

    return () => {
      instance._tiptapEditor.destroy();
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return editor;
};
