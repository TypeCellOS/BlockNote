import {
  getDiagramPlainTextContent,
  renderDiagramToImage,
} from "@blocknote/diagram-block";
import { AlignmentType, ImageRun, Paragraph } from "docx";

import { docxBlockMappingForDefaultSchema } from "../docx/defaultSchema/blocks.js";

/**
 * Block mapping for `@blocknote/diagram-block` that embeds diagrams as
 * images instead of their Mermaid source:
 *
 * ```ts
 * new DOCXExporter(schema, {
 *   ...docxDefaultSchemaMappings,
 *   blockMapping: {
 *     ...docxDefaultSchemaMappings.blockMapping,
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
  ...args: Parameters<typeof docxBlockMappingForDefaultSchema.diagram>
) => {
  const [block] = args;

  try {
    const { dataURL, width, height } = await renderDiagramToImage(
      getDiagramPlainTextContent(block.content),
    );
    const blob = await (await fetch(dataURL)).blob();

    return new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({
          data: await blob.arrayBuffer(),
          type: "png",
          transformation: { width, height },
        }),
      ],
    });
  } catch {
    return docxBlockMappingForDefaultSchema.diagram(...args);
  }
};
