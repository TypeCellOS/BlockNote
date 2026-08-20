import type {
  BlockConfig,
  BlockFromConfigNoChildren,
  Exporter,
} from "@blocknote/core";
import { plainContentToString } from "@blocknote/core";
import type { TypstExporter } from "@blocknote/xl-pdf-renderer-2";
import { errorPlaceholder, strLit } from "@blocknote/xl-pdf-renderer-2";

import type { RenderDiagram } from "../helpers/renderDiagramToImage.js";
import { renderDiagramToSVG } from "../helpers/renderDiagramToSVG.js";
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
// placeholder, identifying the diagram by the (first line of the) source.
// The parser's message is deliberately NOT rendered: it's authoring detail
// (and untranslated English) - the editor is where the author sees and
// fixes it.
function errorText(
  exporter: Exporter<any, any, any, any, any, any, any>,
  source: string,
): string {
  return `#align(center)[#${errorPlaceholder(
    getDiagramExporterDictionary(exporter).invalid_diagram(
      source.split("\n")[0],
    ),
  )}]`;
}

/**
 * Creates a Typst block mapping for `@blocknote/diagram-block` that embeds
 * diagrams as vector SVG images (crisp at any zoom), in a tagged Figure
 * carrying the diagram source as its alt text (PDF/UA requires figures to
 * have one). Labels render in the exporter's own `fontFamily`, matching the
 * document. Rendering runs in the browser by default (Mermaid can't render
 * outside of it); when exporting elsewhere (e.g. server-side), pass a
 * `renderDiagram` function backed by e.g. `@mermaid-js/mermaid-cli` or a
 * Kroki server (raster output like PNG works too). Invalid sources render
 * an error placeholder (mirroring the editor):
 *
 * ```ts
 * import { createDiagramBlockMapping } from "@blocknote/diagram-block/typst-exporter";
 *
 * new TypstExporter(schema, {
 *   ...typstDefaultSchemaMappings,
 *   blockMapping: {
 *     ...typstDefaultSchemaMappings.blockMapping,
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
  ): Promise<string> => {
    const source = plainContentToString(block.content);
    if (!source.trim()) {
      return "";
    }

    const typstExporter = exporter as unknown as TypstExporter<any, any, any>;

    // The default renderer emits vector SVG, with labels in the exporter's
    // resolved font list (fontFamilies: the CJK fallbacks AND the emoji
    // family must reach diagram labels, exactly as they do body text).
    const fontFamily = `${typstExporter.fontFamilies
      .map((f) => `"${f}"`)
      .join(", ")}, sans-serif`;
    const renderDiagram =
      options?.renderDiagram ??
      (typeof document !== "undefined"
        ? (s: string) => renderDiagramToSVG(s, { fontFamily })
        : undefined);
    if (!renderDiagram) {
      throw new Error(
        "Rendering diagrams to images requires a browser. When exporting elsewhere, pass a `renderDiagram` function to `createDiagramBlockMapping` (e.g. backed by @mermaid-js/mermaid-cli or a Kroki server).",
      );
    }

    const result = await renderDiagram(source);
    if (result.error !== undefined) {
      return errorText(exporter, source);
    }

    // The rendered bytes become a Typst shadow file the markup references by
    // path; the exporter's `assetFiles` carries them to the compile step.
    const path = typstExporter.registerImageBytes(
      `diagram:${source}`,
      result.image.data,
    );
    const width = Math.min(
      result.image.width * PIXELS_PER_POINT,
      MAX_WIDTH_POINTS,
    );
    // Centering must go through `show figure: set align` - Typst figures
    // ignore an outer `align` (typst PR #4276).
    return `#[#show figure: set align(center); #figure(image(${strLit(
      path,
    )}, width: ${width.toFixed(1)}pt), alt: ${strLit(source)})]`;
  };
}

/**
 * Typst block mapping for `@blocknote/diagram-block` with the default
 * options - see {@link createDiagramBlockMapping}. Browser-only; when
 * exporting elsewhere, use the factory to pass a `renderDiagram` function.
 */
export const diagramBlockMapping = createDiagramBlockMapping();
