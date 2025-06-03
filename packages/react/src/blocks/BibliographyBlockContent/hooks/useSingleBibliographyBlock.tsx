import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
  BlockNoteEditor,
} from "@blocknote/core";
import { useEditorChange } from "../../../hooks/useEditorChange.js";

export const useSingleBibliographyBlock = <
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor?: BlockNoteEditor<B, I, S>,
) => {
  useEditorChange((editor) => {
    const bibliographyBlockIds: string[] = [];

    editor.forEachBlock((block) => {
      if (block.type === "bibliography") {
        bibliographyBlockIds.push(block.id);
      }

      return true;
    }, true);

    if (bibliographyBlockIds.length > 1) {
      editor.removeBlocks(bibliographyBlockIds.slice(1));
    }
  }, editor);
};
