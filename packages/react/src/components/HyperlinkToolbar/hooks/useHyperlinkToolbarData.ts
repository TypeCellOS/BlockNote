import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  HyperlinkToolbarData,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { useEffect, useState } from "react";
import { UiComponentData } from "../../../components-shared/UiComponentTypes";

export function useHyperlinkToolbarData<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>
): UiComponentData<HyperlinkToolbarData, "hyperlinkToolbar"> {
  const [text, setText] = useState<string>();
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    return editor.hyperlinkToolbar.onDataUpdate((data) => {
      setText(data.text);
      setUrl(data.url);
    });
  }, [editor]);

  return {
    text: text!,
    url: url!,
    deleteHyperlink: editor.hyperlinkToolbar.deleteHyperlink,
    editHyperlink: editor.hyperlinkToolbar.editHyperlink,
    startHideTimer: editor.hyperlinkToolbar.startHideTimer,
    stopHideTimer: editor.hyperlinkToolbar.stopHideTimer,
  };
}
