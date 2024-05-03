import {
  BlockNoteEditor,
  BlockNoteEditorOptions,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
  BlockFromConfig,
  BlockSchemaWithBlock,
} from "@blocknote/core";
import { DependencyList, FC, useMemo } from "react";
import { ImageFile } from "../components/FileBlock/ImageFile";

/**
 * Main hook for importing a BlockNote editor into a React project
 *
 * TODO: document in docs
 */
export const useCreateBlockNote = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  ISchema extends InlineContentSchema = DefaultInlineContentSchema,
  SSchema extends StyleSchema = DefaultStyleSchema
>(
  options: Partial<
    Omit<
      BlockNoteEditorOptions<BSchema, ISchema, SSchema>,
      "renderFileExtension"
    > & {
      renderFileExtension: Record<
        string,
        FC<{
          block: BlockFromConfig<DefaultBlockSchema["file"], ISchema, SSchema>;
          editor: BlockNoteEditor<
            BlockSchemaWithBlock<"file", DefaultBlockSchema["file"]>,
            ISchema,
            SSchema
          >;
        }>
      >;
    }
  > = {},
  deps: DependencyList = []
) => {
  return useMemo(() => {
    const { renderFileExtension, ...rest } = options;

    const editor = BlockNoteEditor.create<BSchema, ISchema, SSchema>({
      renderFileExtension: {
        // png: ImageFile,
        // jpg: ImageFile,
        // jpeg: ImageFile,
      },
      ...rest,
    });
    if (window) {
      // for testing / dev purposes
      (window as any).ProseMirror = editor._tiptapEditor;
    }
    return editor;
  }, deps); //eslint-disable-line react-hooks/exhaustive-deps
};

/**
 * @deprecated use useCreateBlockNote instead
 */
export const useBlockNote = useCreateBlockNote;
