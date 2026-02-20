import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from "@blocknote/core";
import { TsxExporter } from "../../exporters/tsx/TsxExporter.js";
import { makeDocumentStateBuilder } from "../DocumentStateBuilder.js";
import { StreamToolsConfig, StreamToolsProvider } from "../formats.js";
import { tools } from "./tools/index.js";

const systemPrompt = `You are manipulating a text document using TSX components.
Each block is represented as a TSX component with props.
`;

// Reuse the same schema creation logic or import if available centrally.
// Ideally, the exporter should accept any schema, but for default builder we need one.
// We'll create a default one similar to tests.
const defaultSchema = BlockNoteSchema.create({
  blockSpecs: defaultBlockSpecs,
  inlineContentSpecs: defaultInlineContentSpecs,
  styleSpecs: defaultStyleSpecs,
});

const exporter = new TsxExporter(defaultSchema);

export const tsxDocumentLLMFormat = {
  getStreamToolsProvider: <T extends StreamToolsConfig>(
    _opts: { withDelays?: boolean; defaultStreamTools?: T } = {},
  ): StreamToolsProvider<string, T> => ({
    getStreamTools: (_editor, _selectionInfo, _onBlockUpdate) => {
      // Return the placeholder replacement tool
      return [tools.replace];
    },
  }),
  systemPrompt,
  tools,
  defaultDocumentStateBuilder: makeDocumentStateBuilder(
    async (_editor, block) => {
      // We wrap the single block in an array because toTsx expects an array
      // But verify what block structure is passed.
      // makeDocumentStateBuilder passes a Block object.
      // toTsx expects BlockFromConfig.
      // We can cast or minimal wrapper.
      return exporter.toTsx([block] as any);
    },
  ),
};
