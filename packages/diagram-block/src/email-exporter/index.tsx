import type {
  BlockConfig,
  BlockFromConfigNoChildren,
  Exporter,
} from "@blocknote/core";
import { plainContentToString } from "@blocknote/core";
import {
  dataURLImageDelivery,
  ReactEmailImageDelivery,
} from "@blocknote/xl-email-exporter";
import { Img, Text } from "@react-email/components";

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

// Emails render in containers around 600px wide.
const MAX_WIDTH_PIXELS = 600;

/**
 * Creates an email block mapping for `@blocknote/diagram-block` that embeds
 * diagrams as images, with the Mermaid source as the alt text. Rendering
 * runs in the browser by default (Mermaid can't render outside of it); when
 * exporting elsewhere (e.g. server-side email rendering), pass a
 * `renderDiagram` function backed by e.g. `@mermaid-js/mermaid-cli` or a
 * Kroki server. Images are embedded as data URLs by default; pass an
 * `imageDelivery` (e.g. `createCIDImageDelivery` from
 * `@blocknote/xl-email-exporter`) to deliver them as inline `cid:`
 * attachments instead, which more email clients display. Invalid sources
 * render an error placeholder (mirroring the editor):
 *
 * ```ts
 * import { createDiagramBlockMapping } from "@blocknote/diagram-block/email-exporter";
 *
 * new ReactEmailExporter(schema, {
 *   ...reactEmailDefaultSchemaMappings,
 *   blockMapping: {
 *     ...reactEmailDefaultSchemaMappings.blockMapping,
 *     diagram: createDiagramBlockMapping({ renderDiagram, imageDelivery }),
 *   },
 * });
 * ```
 */
export function createDiagramBlockMapping(options?: {
  renderDiagram?: RenderDiagram;
  imageDelivery?: ReactEmailImageDelivery;
}) {
  return async (
    block: DiagramBlock,
    exporter: Exporter<any, any, any, any, any, any, any>,
  ) => {
    const source = plainContentToString(block.content);
    if (!source.trim()) {
      return <span />;
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
      // Mirrors the editor, which shows the error state in the preview
      // placeholder, identifying the diagram by the (first line of the)
      // source. The parser's message is deliberately NOT rendered: it's
      // authoring detail (and untranslated English) - the editor is where
      // the author sees and fixes it.
      return (
        <Text style={{ color: "#999999", textAlign: "center" }}>
          {getDiagramExporterDictionary(exporter).invalid_diagram(
            source.split("\n")[0],
          )}
        </Text>
      );
    }

    const displayWidth = Math.min(result.image.width, MAX_WIDTH_PIXELS);
    const src = (options?.imageDelivery ?? dataURLImageDelivery).deliver({
      ...result.image,
      name: "diagram",
    });

    return (
      <Img
        src={src}
        alt={source}
        width={displayWidth}
        height={Math.round(
          (displayWidth / result.image.width) * result.image.height,
        )}
        style={{ display: "block", margin: "0 auto" }}
      />
    );
  };
}

/**
 * Email block mapping for `@blocknote/diagram-block` with the default
 * options - see {@link createDiagramBlockMapping}. Browser-only; when
 * exporting elsewhere, use the factory to pass a `renderDiagram` function.
 */
export const diagramBlockMapping = createDiagramBlockMapping();
