import type {
  BlockConfig,
  BlockFromConfigNoChildren,
  Exporter,
} from "@blocknote/core";
import { exportImageToDataURL, plainContentToString } from "@blocknote/core";
import {
  createODTImageParagraph,
  ODTExporter,
} from "@blocknote/xl-odt-exporter";
import { createElement } from "react";

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

// Mirrors the editor, which shows the error state in the preview
// placeholder, identifying the diagram by the (first line of the) source.
// The parser's message is deliberately NOT rendered: it's authoring detail
// (and untranslated English) - the editor is where the author sees and
// fixes it. Styled muted like the
// other exporters' placeholders.
function errorMessage(
  exporter: ODTExporter<any, any, any>,
  source: string,
): string {
  return getDiagramExporterDictionary(exporter).invalid_diagram(
    source.split("\n")[0],
  );
}

function errorParagraph(source: string, exporter: ODTExporter<any, any, any>) {
  const styleName = exporter.registerStyle((name) =>
    createElement(
      "style:style",
      { "style:family": "text", "style:name": name },
      createElement("style:text-properties", {
        "fo:font-style": "italic",
        "fo:color": "#999999",
      }),
    ),
  );

  return createElement(
    "text:p",
    null,
    createElement(
      "text:span",
      { "text:style-name": styleName },
      errorMessage(exporter, source),
    ),
  );
}

/**
 * Creates an ODT block mapping for `@blocknote/diagram-block` that embeds
 * diagrams as images. Rendering runs in the browser by default (Mermaid
 * can't render outside of it); when exporting elsewhere (e.g. server-side),
 * pass a `renderDiagram` function backed by e.g. `@mermaid-js/mermaid-cli`
 * or a Kroki server. Invalid sources render an error placeholder (mirroring
 * the editor):
 *
 * ```ts
 * import { createDiagramBlockMapping } from "@blocknote/diagram-block/odt-exporter";
 *
 * new ODTExporter(schema, {
 *   ...odtDefaultSchemaMappings,
 *   blockMapping: {
 *     ...odtDefaultSchemaMappings.blockMapping,
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
    // Only the ODTExporter invokes ODT mappings, but mapping signatures are
    // contravariant in the exporter parameter, so requiring the subclass here
    // wouldn't satisfy the mapping type - hence the base type + cast.
    const odtExporter = exporter as ODTExporter<any, any, any>;
    const source = plainContentToString(block.content);
    if (!source.trim()) {
      return createElement("text:p");
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
      return errorParagraph(source, odtExporter);
    }

    // The image may be rendered above its display size for sharpness, so
    // pass the diagram's display dimensions rather than the picture's own.
    return await createODTImageParagraph(
      odtExporter,
      exportImageToDataURL(result.image),
      {
        width: result.image.width,
        height: result.image.height,
        align: "center",
      },
    );
  };
}

/**
 * ODT block mapping for `@blocknote/diagram-block` with the default options
 * - see {@link createDiagramBlockMapping}. Browser-only; when exporting
 * elsewhere, use the factory to pass a `renderDiagram` function.
 */
export const diagramBlockMapping = createDiagramBlockMapping();
