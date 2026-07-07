import {
  getDiagramPlainTextContent,
  renderDiagramToImage,
} from "@blocknote/diagram-block";
import { Image } from "@react-pdf/renderer";

import { pdfBlockMappingForDefaultSchema } from "../pdf/defaultSchema/blocks.js";

const PIXELS_PER_POINT = 0.75;
const MAX_WIDTH_POINTS = 400;

/**
 * Block mapping for `@blocknote/diagram-block` that embeds diagrams as
 * images instead of their Mermaid source:
 *
 * ```ts
 * new PDFExporter(schema, {
 *   ...pdfDefaultSchemaMappings,
 *   blockMapping: {
 *     ...pdfDefaultSchemaMappings.blockMapping,
 *     diagram: diagramBlockMapping,
 *   },
 * });
 * ```
 *
 * Rendering the diagram needs a browser; there (and for invalid sources), it
 * falls back to the default source code rendering. Kept out of the default
 * mappings so exporting without diagram blocks doesn't load Mermaid.
 */
export const diagramBlockMapping = async (
  ...args: Parameters<typeof pdfBlockMappingForDefaultSchema.diagram>
) => {
  const [block] = args;

  try {
    const { dataURL, width } = await renderDiagramToImage(
      getDiagramPlainTextContent(block.content),
    );

    return (
      <Image
        src={dataURL}
        style={{
          width: Math.min(width * PIXELS_PER_POINT, MAX_WIDTH_POINTS),
          alignSelf: "center",
        }}
      />
    );
  } catch {
    return pdfBlockMappingForDefaultSchema.diagram(...args);
  }
};
