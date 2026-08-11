import type {
  BlockConfig,
  BlockFromConfigNoChildren,
  Exporter,
} from "@blocknote/core";
import { exportImageToDataURL, plainContentToString } from "@blocknote/core";
import { Image, Text, View } from "@react-pdf/renderer";

import {
  RenderDiagram,
  renderDiagramToImage,
} from "../helpers/renderDiagramToImage.js";
import { getDiagramExporterDictionary } from "../i18n/dictionary.js";

export type { RenderDiagram } from "../helpers/renderDiagramToImage.js";

type DiagramBlock = BlockFromConfigNoChildren<
  BlockConfig<"diagram", {}, "plain">,
  any,
  any
>;

const PIXELS_PER_POINT = 0.75;
const MAX_WIDTH_POINTS = 400;

// Mirrors the editor, which shows the error state in the preview
// placeholder. The (first line of the) source identifies which diagram
// broke; the message comes from the typed error result, so it's safe to
// show. Both span multiple lines, so only the first of each is used. The
// text comes from the diagram dictionary (see ExporterOptions.dictionary).
function errorText(
  exporter: Exporter<any, any, any, any, any, any, any>,
  source: string,
  message: string,
) {
  return (
    <View key={"diagram"} style={{ alignItems: "center" }}>
      <Text style={{ color: "#999999" }}>
        {getDiagramExporterDictionary(exporter).invalid_diagram(
          source.split("\n")[0],
          message.split("\n")[0],
        )}
      </Text>
    </View>
  );
}

/**
 * Creates a PDF block mapping for `@blocknote/diagram-block` that embeds
 * diagrams as images. Rendering runs in the browser by default (Mermaid
 * can't render outside of it); when exporting elsewhere (e.g. server-side),
 * pass a `renderDiagram` function backed by e.g. `@mermaid-js/mermaid-cli`
 * or a Kroki server. Invalid sources render an error placeholder (mirroring
 * the editor):
 *
 * ```ts
 * import { createDiagramBlockMapping } from "@blocknote/diagram-block/pdf-exporter";
 *
 * new PDFExporter(schema, {
 *   ...pdfDefaultSchemaMappings,
 *   blockMapping: {
 *     ...pdfDefaultSchemaMappings.blockMapping,
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
      return <View key={"diagram"} />;
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
      return errorText(exporter, source, result.error);
    }

    return (
      <Image
        src={exportImageToDataURL(result.image)}
        style={{
          width: Math.min(
            result.image.width * PIXELS_PER_POINT,
            MAX_WIDTH_POINTS,
          ),
          alignSelf: "center",
        }}
      />
    );
  };
}

/**
 * PDF block mapping for `@blocknote/diagram-block` with the default options
 * - see {@link createDiagramBlockMapping}. Browser-only; when exporting
 * elsewhere, use the factory to pass a `renderDiagram` function.
 */
export const diagramBlockMapping = createDiagramBlockMapping();
