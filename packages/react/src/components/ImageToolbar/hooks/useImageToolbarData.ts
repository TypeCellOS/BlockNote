import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  ImageToolbarData,
  InlineContentSchema,
  SpecificBlock,
  StyleSchema,
} from "@blocknote/core";
import { useEffect, useState } from "react";
import { UiComponentData } from "../../../components-shared/UiComponentTypes";

export function useImageToolbarData<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>
): UiComponentData<ImageToolbarData<BSchema, I, S>, "imageToolbar"> {
  const [block, setBlock] = useState<SpecificBlock<BSchema, "image", I, any>>();

  useEffect(() => {
    return editor.imageToolbar.onDataUpdate((data) => {
      setBlock(data.block);
    });
  }, [editor]);

  return {
    block: block!,
  };
}
