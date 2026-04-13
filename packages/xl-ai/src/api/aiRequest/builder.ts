import { BlockNoteEditor } from "@blocknote/core";
import { isEmptyParagraph } from "../../util/emptyBlock.js";
import {
  aiDocumentFormats,
  AIRequest,
  DocumentStateBuilder,
  StreamToolsProvider,
} from "../index.js";
import { trimEmptyBlocks } from "../promptHelpers/trimEmptyBlocks.js";

export async function buildAIRequest(opts: {
  editor: BlockNoteEditor<any, any, any>;
  useSelection?: boolean;
  deleteEmptyCursorBlock?: boolean;
  streamToolsProvider?: StreamToolsProvider<any, any>;
  onBlockUpdated?: (blockId: string) => void;
  onStart?: () => void;
  documentStateBuilder?: DocumentStateBuilder<any>;
}): Promise<AIRequest> {
  const {
    useSelection,
    deleteEmptyCursorBlock,
    streamToolsProvider,
    documentStateBuilder,
    onStart,
  } = {
    useSelection: opts.useSelection ?? false,
    deleteEmptyCursorBlock: opts.deleteEmptyCursorBlock ?? true,
    streamToolsProvider:
      opts.streamToolsProvider ??
      aiDocumentFormats.html.getStreamToolsProvider(),
    documentStateBuilder:
      opts.documentStateBuilder ??
      aiDocumentFormats.html.defaultDocumentStateBuilder,
    onStart:
      opts.onStart ??
      (() => {
        // ignore
      }),
  };
  const cursorBlock = useSelection
    ? undefined
    : opts.editor.getTextCursorPosition().block;

  const emptyCursorBlockToDelete: string | undefined =
    cursorBlock &&
    deleteEmptyCursorBlock &&
    isEmptyParagraph(cursorBlock) &&
    trimEmptyBlocks(opts.editor.document).length > 0
      ? cursorBlock.id
      : undefined;

  const selectionInfo = useSelection
    ? opts.editor.getSelectionCutBlocks(true)
    : undefined;

  const streamTools = streamToolsProvider.getStreamTools(
    opts.editor,
    selectionInfo
      ? {
          from: selectionInfo._meta.startPos,
          to: selectionInfo._meta.endPos,
        }
      : undefined,
    opts.onBlockUpdated,
  );

  const ret = {
    editor: opts.editor,
    selectedBlocks: selectionInfo?.blocks,
    streamTools,
    emptyCursorBlockToDelete,
    onStart,
  };
  return {
    ...ret,
    documentState: await documentStateBuilder(ret),
  };
}
