import { BlockNoteEditor } from "@blocknote/core";
import { StreamTool } from "../../../streamTool/streamTool.js";
import { makeDocumentStateBuilder } from "../DocumentStateBuilder.js";
import {
  StreamToolsConfig,
  StreamToolsProvider,
  StreamToolsResult,
} from "../formats.js";
import { tools } from "./tools/index.js";

function getStreamTools<
  T extends StreamToolsConfig = { add: true; update: true; delete: true },
>(
  editor: BlockNoteEditor<any, any, any>,
  withDelays: boolean,
  defaultStreamTools?: T,
  selectionInfo?:
    | {
        from: number;
        to: number;
      }
    | boolean,
  onBlockUpdate?: (blockId: string) => void,
): StreamToolsResult<string, T> {
  if (typeof selectionInfo === "boolean") {
    const selection = selectionInfo
      ? editor.getSelectionCutBlocks(true)
      : undefined;

    selectionInfo = selection
      ? {
          from: selection._meta.startPos,
          to: selection._meta.endPos,
        }
      : undefined;
  }

  const mergedStreamTools =
    defaultStreamTools ??
    ({
      add: true,
      update: true,
      delete: true,
    } as T);

  const streamTools: StreamTool<any>[] = [
    ...(mergedStreamTools.update
      ? [
          tools.update(editor, {
            idsSuffixed: true,
            withDelays,
            updateSelection: selectionInfo,
            onBlockUpdate,
          }),
        ]
      : []),
    ...(mergedStreamTools.add
      ? [tools.add(editor, { idsSuffixed: true, withDelays, onBlockUpdate })]
      : []),
    ...(mergedStreamTools.delete
      ? [tools.delete(editor, { idsSuffixed: true, withDelays, onBlockUpdate })]
      : []),
  ];

  return streamTools as StreamToolsResult<string, T>;
}

const systemPrompt = `You're manipulating a text document using HTML blocks. 
Make sure to follow the json schema provided. When referencing ids they MUST be EXACTLY the same (including the trailing $). 
List items are 1 block with 1 list item each, so block content \`<ul><li>item1</li></ul>\` is valid, but \`<ul><li>item1</li><li>item2</li></ul>\` is invalid. We'll merge them automatically.
For code blocks, you can use the \`data-language\` attribute on a <code> block (wrapped with <pre>) to specify the language.

If the user requests updates to the document, use the "applyDocumentOperations" tool to update the document.
---
IF there is no selection active in the latest state, first, determine what part of the document the user is talking about. You SHOULD probably take cursor info into account if needed.
  EXAMPLE: if user says "below" (without pointing to a specific part of the document) he / she probably indicates the block(s) after the cursor. 
  EXAMPLE: If you want to insert content AT the cursor position (UNLESS indicated otherwise by the user), then you need \`referenceId\` to point to the block before the cursor with position \`after\` (or block below and \`before\`
---
 `;

export const htmlBlockLLMFormat = {
  /**
   * Function to get the stream tools that can apply HTML block updates to the editor
   */
  getStreamToolsProvider: <
    T extends StreamToolsConfig = { add: true; update: true; delete: true },
  >(
    opts: { withDelays?: boolean; defaultStreamTools?: T } = {},
  ): StreamToolsProvider<string, T> => ({
    getStreamTools: (editor, selectionInfo, onBlockUpdate) => {
      return getStreamTools(
        editor,
        opts.withDelays ?? true,
        opts.defaultStreamTools,
        selectionInfo,
        onBlockUpdate,
      );
    },
  }),
  systemPrompt,
  tools,

  /**
   * The default DocumentStateBuilder that can take an editor and convert it to a document state that can be passed to the backend
   */
  defaultDocumentStateBuilder: makeDocumentStateBuilder(
    async (editor, block) => {
      return editor.blocksToHTMLLossy([block]);
    },
  ),
};
