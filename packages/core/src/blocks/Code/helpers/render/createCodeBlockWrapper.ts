import type { BlockNoteEditor } from "../../../../editor/BlockNoteEditor.js";
import type { BlockFromConfig } from "../../../../schema/index.js";
import type { CodeBlockOptions } from "../../CodeBlockOptions.js";
import { createPreviewWithSourcePopup } from "./createPreviewWithSourcePopup.js";
import { createSourceBlock } from "./createSourceBlock.js";

export const createCodeBlockWrapper =
  (options: CodeBlockOptions) =>
  (block: BlockFromConfig<any, any, any>, editor: BlockNoteEditor<any>) => {
    const language = block.props.language || options.defaultLanguage || "text";
    const renderPreview = options.supportedLanguages?.[language]?.createPreview;

    // Languages with a preview show the rendered result by default, with the
    // editable source in a popup when selected. Other languages just show the
    // source.
    return renderPreview
      ? createPreviewWithSourcePopup(options)(block, editor, renderPreview)
      : createSourceBlock(options)(block, editor);
  };
