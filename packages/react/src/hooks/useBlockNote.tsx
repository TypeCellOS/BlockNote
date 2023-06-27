import {
  BlockContainerExtension,
  BlockGroupExtension,
  BlockNoteEditor,
  BlockNoteEditorOptions,
  BlockSchema,
  DefaultBlockSchema,
  ParagraphBlockContentExtension
} from "@blocknote/core";
import { DependencyList, FC, useMemo, useState } from "react";
import {
  DragHandleMenuProps
} from "../BlockSideMenu/components/DragHandleMenu";
import { useRemirror } from "@remirror/react";
import { DocExtension } from "@remirror/extension-doc";
import { TextExtension } from "@remirror/extension-text";

//based on https://github.com/ueberdosis/tiptap/blob/main/packages/react/src/useEditor.ts

type CustomElements<BSchema extends BlockSchema> = Partial<{
  formattingToolbar: FC<{ editor: BlockNoteEditor<BSchema> }>;
  dragHandleMenu: FC<DragHandleMenuProps<BSchema>>;
}>;

function useForceUpdate() {
  const [, setValue] = useState(0);

  return () => setValue((value) => value + 1);
}

/**
 * Main hook for importing a BlockNote editor into a React project
 */
export const useBlockNote = <BSchema extends BlockSchema = DefaultBlockSchema>(
  options: Partial<
    BlockNoteEditorOptions<BSchema> & {
      customElements: CustomElements<BSchema>;
    }
  > = {},
  deps: DependencyList = []
) => {
  //const [editor, editorsetEditor] = useState<BlockNoteEditor<BSchema> | null>(null);

  const {manager, state} = useRemirror({
    extensions: () => [
      new BlockGroupExtension({ priority: 10 }),
      new BlockContainerExtension(),
      new DocExtension({
        content: "blockGroup",
      }),
      new TextExtension(),
      new ParagraphBlockContentExtension(),
    ],
    selection: 'start',
    stringHandler: 'html',
  });

  const editor = useMemo(() => { return new BlockNoteEditor({}, manager)},[manager])

  return editor;

  // const [editor, setEditor] = useState<BlockNoteEditor<BSchema> | null>(null);
  // const forceUpdate = useForceUpdate();
  //
  // useEffect(() => {
  //   let isMounted = true;
  //   // TODO: Fix typing. UiFactories expects only BaseSlashMenuItems, not extended types. Can be fixed with a generic,
  //   //  but it would have to be on several different classes (BlockNoteEditor, BlockNoteEditorOptions, UiFactories) and
  //   //  gets messy quick.
  //   let newOptions: Record<any, any> = {
  //     slashCommands: defaultReactSlashMenuItems,
  //     ...options,
  //   };
  //
  //   if (newOptions.customElements && newOptions.uiFactories) {
  //     console.warn(
  //       "BlockNote editor initialized with both `customElements` and `uiFactories` options, prioritizing `uiFactories`."
  //     );
  //   }
  //
  //   let uiFactories = {
  //     formattingToolbarFactory: createReactFormattingToolbarFactory(
  //       getBlockNoteTheme(newOptions.theme === "dark"),
  //       newOptions.customElements?.formattingToolbar
  //     ),
  //     hyperlinkToolbarFactory: createReactHyperlinkToolbarFactory(
  //       getBlockNoteTheme(newOptions.theme === "dark")
  //     ),
  //     slashMenuFactory: createReactSlashMenuFactory(
  //       getBlockNoteTheme(newOptions.theme === "dark")
  //     ),
  //     blockSideMenuFactory: createReactBlockSideMenuFactory(
  //       getBlockNoteTheme(newOptions.theme === "dark"),
  //       newOptions.customElements?.dragHandleMenu
  //     ),
  //     ...newOptions.uiFactories,
  //   };
  //
  //   newOptions = {
  //     ...newOptions,
  //     uiFactories,
  //   };
  //
  //   console.log("create new blocknote instance");
  //   const instance = new BlockNoteEditor<BSchema>(
  //     newOptions as Partial<BlockNoteEditorOptions<BSchema>>
  //   );
  //
  //   setEditor(instance);
  //
  //   instance._tiptapEditor.on("transaction", () => {
  //     requestAnimationFrame(() => {
  //       requestAnimationFrame(() => {
  //         if (isMounted) {
  //           forceUpdate();
  //         }
  //       });
  //     });
  //   });
  //
  //   return () => {
  //     instance._tiptapEditor.destroy();
  //     isMounted = false;
  //   };
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, deps);
  //
  // return editor;
};
