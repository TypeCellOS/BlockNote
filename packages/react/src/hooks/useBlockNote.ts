import {
  BlockNoteEditor,
  BlockNoteEditorOptions,
  BlockSchemaFromSpecs,
  BlockSpecs,
  InlineContentSchemaFromSpecs,
  InlineContentSpecs,
  StyleSchemaFromSpecs,
  StyleSpecs,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
  getBlockSchemaFromSpecs,
} from "@blocknote/core";
import { DependencyList, useMemo, useRef } from "react";
import { getDefaultReactSlashMenuItems } from "../slashMenuItems/defaultReactSlashMenuItems";
import { ReactSlashMenuItem } from "../slashMenuItems/ReactSlashMenuItem";
import { NoInfer } from "@blocknote/core/src/util/typescript";

type ReactBlockNoteEditorOptions<
  BSpecs extends BlockSpecs,
  ISpecs extends InlineContentSpecs,
  SSpecs extends StyleSpecs
> = Omit<BlockNoteEditorOptions<BSpecs, ISpecs, SSpecs>, 'slashMenuItems'> & {
  slashMenuItems: Array<
    ReactSlashMenuItem<
      BlockSchemaFromSpecs<NoInfer<BSpecs>>,
      any,
      any
    >
  >
};

const initEditor = <
  BSpecs extends BlockSpecs,
  ISpecs extends InlineContentSpecs,
  SSpecs extends StyleSpecs
>(
  options: Partial<ReactBlockNoteEditorOptions<BSpecs, ISpecs, SSpecs>>
) =>
  BlockNoteEditor.create({
    slashMenuItems: getDefaultReactSlashMenuItems(
      getBlockSchemaFromSpecs(options.blockSpecs as BSpecs || defaultBlockSpecs)
    ),
    ...options,
  });

/**
 * Main hook for importing a BlockNote editor into a React project
 */
export const useBlockNote = <
  BSpecs extends BlockSpecs = typeof defaultBlockSpecs,
  ISpecs extends InlineContentSpecs = typeof defaultInlineContentSpecs,
  SSpecs extends StyleSpecs = typeof defaultStyleSpecs
>(
  options: Partial<ReactBlockNoteEditorOptions<BSpecs, ISpecs, SSpecs>> = {},
  deps: DependencyList = []
) => {
  const editorRef =
    useRef<
      BlockNoteEditor<
        BlockSchemaFromSpecs<BSpecs>,
        InlineContentSchemaFromSpecs<ISpecs>,
        StyleSchemaFromSpecs<SSpecs>
      >
    >();

  return useMemo(() => {
    if (editorRef.current) {
      editorRef.current._tiptapEditor.destroy();
    }

    editorRef.current = initEditor(options);
    return editorRef.current!;
  }, deps); //eslint-disable-line react-hooks/exhaustive-deps
};
