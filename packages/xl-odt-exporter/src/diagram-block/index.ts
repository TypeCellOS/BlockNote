import {
  getDiagramPlainTextContent,
  renderDiagramToImage,
} from "@blocknote/diagram-block";

import { odtBlockMappingForDefaultSchema } from "../odt/defaultSchema/blocks.js";
import { ODTExporter } from "../odt/odtExporter.js";
import { createODTImageParagraph } from "../odt/util/createODTImageParagraph.js";

/**
 * Block mapping for `@blocknote/diagram-block` that embeds diagrams as
 * images instead of their Mermaid source:
 *
 * ```ts
 * new ODTExporter(schema, {
 *   ...odtDefaultSchemaMappings,
 *   blockMapping: {
 *     ...odtDefaultSchemaMappings.blockMapping,
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
  ...args: Parameters<typeof odtBlockMappingForDefaultSchema.diagram>
) => {
  const [block, exporter] = args;

  try {
    const { dataURL, width, height } = await renderDiagramToImage(
      getDiagramPlainTextContent(block.content),
    );

    // The image is rendered at 2x, so pass the diagram's logical dimensions
    // rather than the picture's own.
    return await createODTImageParagraph(
      exporter as ODTExporter<any, any, any>,
      dataURL,
      { width, height, align: "center" },
    );
  } catch {
    return odtBlockMappingForDefaultSchema.diagram(...args);
  }
};
