import type {
  BlockConfig,
  BlockFromConfigNoChildren,
  Exporter,
} from "@blocknote/core";
import { plainContentToString } from "@blocknote/core";
import { AlignmentType, ImageRun, Paragraph, TextRun } from "docx";

import {
  RenderDiagram,
  renderDiagramToImage,
} from "../helpers/renderDiagramToImage.js";
import { getDiagramExporterDictionary } from "../i18n/dictionary.js";

export type { RenderDiagram } from "../helpers/renderDiagramToImage.js";

const MAX_WIDTH_PIXELS = 600;

type DiagramBlock = BlockFromConfigNoChildren<
  BlockConfig<"diagram", {}, "plain">,
  any,
  any
>;

// Mirrors the editor, which shows the error state in the preview
// placeholder, identifying the diagram by the (first line of the) source.
// The parser's message is deliberately NOT rendered: it's authoring detail
// (and untranslated English) - the editor is where the author sees and
// fixes it.
function errorParagraph(
  exporter: Exporter<any, any, any, any, any, any, any>,
  source: string,
) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: getDiagramExporterDictionary(exporter).invalid_diagram(
          source.split("\n")[0],
        ),
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
  return async (
    block: DiagramBlock,
    exporter: Exporter<any, any, any, any, any, any, any>,
  ) => {
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
      return errorParagraph(exporter, source);
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

    // A DOCX body is ~624px wide with default margins; Word clips wider
    // images at the right margin, so scale the display size down to fit
    // (the image data keeps its full resolution).
    const displayWidth = Math.min(result.image.width, MAX_WIDTH_PIXELS);
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({
          data: result.image.data,
          type: imageType,
          transformation: {
            width: displayWidth,
            height: Math.round(
              (displayWidth / result.image.width) * result.image.height,
            ),
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
