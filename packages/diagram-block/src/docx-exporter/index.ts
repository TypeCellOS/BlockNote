import type { BlockConfig, BlockFromConfigNoChildren } from "@blocknote/core";
import { plainContentToString } from "@blocknote/core";
import { AlignmentType, ImageRun, Paragraph, TextRun } from "docx";

import {
  RenderDiagram,
  renderDiagramToImage,
} from "../helpers/renderDiagramToImage.js";

export type { RenderDiagram } from "../helpers/renderDiagramToImage.js";

type DiagramBlock = BlockFromConfigNoChildren<
  BlockConfig<"diagram", {}, "plain">,
  any,
  any
>;

// Mirrors the editor, which shows the error state in the preview
// placeholder. The (first line of the) source identifies which diagram broke;
// the message comes from the typed error result, so it's safe to show.
// Mermaid messages span multiple lines, so only the first is used.
function errorMessage(source: string, message: string): string {
  const sourcePreview = source.split("\n")[0];
  return `Invalid diagram "${sourcePreview}": ${message.split("\n")[0]}`;
}

function errorParagraph(source: string, message: string) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: errorMessage(source, message),
        italics: true,
        color: "999999",
      }),
    ],
  });
}

/**
 * Creates a DOCX block mapping for `@blocknote/diagram-block` that embeds
 * diagrams as images. Rendering runs in the browser by default (Mermaid
 * can't render outside of it); when exporting elsewhere (e.g. server-side),
 * pass a `renderDiagram` function backed by e.g. `@mermaid-js/mermaid-cli`
 * or a Kroki server. Invalid sources render an error placeholder (mirroring
 * the editor):
 *
 * ```ts
 * import { createDiagramBlockMapping } from "@blocknote/diagram-block/docx-exporter";
 *
 * new DOCXExporter(schema, {
 *   ...docxDefaultSchemaMappings,
 *   blockMapping: {
 *     ...docxDefaultSchemaMappings.blockMapping,
 *     diagram: createDiagramBlockMapping({ renderDiagram }),
 *   },
 * });
 * ```
 */
export function createDiagramBlockMapping(options?: {
  renderDiagram?: RenderDiagram;
}) {
  return async (block: DiagramBlock) => {
    const source = plainContentToString(block.content);
    if (!source.trim()) {
      return new Paragraph({});
    }

    const renderDiagram =
      options?.renderDiagram ??
      (typeof document !== "undefined" ? renderDiagramToImage : undefined);
    if (!renderDiagram) {
      throw new Error(
        "Rendering diagrams to images requires a browser. When exporting elsewhere, pass a `renderDiagram` function to `createDiagramBlockMapping` (e.g. backed by @mermaid-js/mermaid-cli or a Kroki server).",
      );
    }

    const result = await renderDiagram(source);
    if (result.error !== undefined) {
      return errorParagraph(source, result.error);
    }

    // Plugged-in renderers aren't required to produce PNGs; embed with the
    // raster format the image declares. An unknown format is a renderer
    // contract violation - mislabeling the bytes would corrupt the document,
    // so it propagates as an error instead.
    const imageTypes = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/gif": "gif",
      "image/bmp": "bmp",
    } as const;
    const imageType =
      imageTypes[result.image.mimeType as keyof typeof imageTypes];
    if (!imageType) {
      throw new Error(
        `DOCX embeds support png/jpeg/gif/bmp diagram images, but the renderer produced "${result.image.mimeType}".`,
      );
    }

    return new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({
          data: result.image.data,
          type: imageType,
          transformation: {
            width: result.image.width,
            height: result.image.height,
          },
        }),
      ],
    });
  };
}

/**
 * DOCX block mapping for `@blocknote/diagram-block` with the default options
 * - see {@link createDiagramBlockMapping}. Browser-only; when exporting
 * elsewhere, use the factory to pass a `renderDiagram` function.
 */
export const diagramBlockMapping = createDiagramBlockMapping();
