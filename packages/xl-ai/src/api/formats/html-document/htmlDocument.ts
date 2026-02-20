import { BlockNoteEditor } from "@blocknote/core";
import { AIRequest } from "../../aiRequest/types.js";
import { StreamToolsConfig, StreamToolsProvider } from "../formats.js";
import { replaceTool } from "./tools/index.js";

const systemPrompt = `You are manipulating a text document using TSX components.
Each block is represented as a TSX component with props.
`;

type BlockRange = {
  start: number;
  end: number;
};

export async function exportHtmlDocument(editor: BlockNoteEditor) {
  const separator = "\n";
  const blockRanges: Map<string, BlockRange> = new Map();
  let document = "";
  for (const block of editor.document) {
    const html = await editor.blocksToHTMLLossy([block]);
    blockRanges.set(block.id, {
      start: document.length,
      end: document.length + html.length,
    });
    document += html + separator;
  }
  document = document.trim();
  return { document, blockRanges };
}

export const htmlDocumentLLMFormat = {
  getStreamToolsProvider: <T extends StreamToolsConfig>(
    opts: { withDelays?: boolean; defaultStreamTools?: T } = {},
  ): StreamToolsProvider<string, T> => ({
    getStreamTools: (editor, _selectionInfo, _onBlockUpdate) => {
      // Return the placeholder replacement tool
      return [
        replaceTool(editor, {
          idsSuffixed: false, // TODO
          withDelays: opts.withDelays ?? true,
        }),
      ];
    },
  }),
  systemPrompt,
  // tools,
  defaultDocumentStateBuilder: async (
    aiRequest: Omit<AIRequest, "documentState">,
  ) => {
    return (await exportHtmlDocument(aiRequest.editor)).document;
  },
};
