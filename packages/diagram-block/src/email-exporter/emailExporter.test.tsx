import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import {
  createCIDImageDelivery,
  ReactEmailExporter,
  reactEmailDefaultSchemaMappings,
} from "@blocknote/xl-email-exporter";
import { describe, expect, it } from "vite-plus/test";

import {
  diagramDocument,
  renderDiagram,
  renderInvalidDiagram,
} from "../exporterTestUtil.js";
import { createDiagramBlockMapping, diagramBlockMapping } from "./index.js";

function createExporter(diagram: ReturnType<typeof createDiagramBlockMapping>) {
  return new ReactEmailExporter(
    BlockNoteSchema.create({ blockSpecs: defaultBlockSpecs }),
    {
      ...reactEmailDefaultSchemaMappings,
      blockMapping: {
        ...reactEmailDefaultSchemaMappings.blockMapping,
        diagram,
      },
    } as any,
  );
}

describe("email exporter mappings", () => {
  it("should embed the rendered diagram as a data URL image", async () => {
    const exporter = createExporter(
      createDiagramBlockMapping({ renderDiagram }),
    );

    const html = await exporter.toReactEmailDocument(diagramDocument);

    expect(html).toContain('src="data:image/png;base64,');
    // The Mermaid source stays available as the alt text.
    expect(html).toContain('alt="graph TD');
  });

  it("should throw a descriptive error without a renderer outside the browser", async () => {
    const exporter = createExporter(diagramBlockMapping);

    await expect(
      exporter.toReactEmailDocument(diagramDocument),
    ).rejects.toThrow("pass a `renderDiagram` function");
  });

  it("should render an error placeholder for invalid sources", async () => {
    // The renderer returns invalid sources as a typed error, and the
    // mapping renders the error placeholder - never the raw source.
    const exporter = createExporter(
      createDiagramBlockMapping({ renderDiagram: renderInvalidDiagram }),
    );

    const html = await exporter.toReactEmailDocument(diagramDocument);

    expect(html).toContain("Invalid diagram");
    expect(html).toContain("graph TD");
    expect(html).not.toContain("<img");
  });

  it("should deliver the image as an inline attachment with a CID delivery", async () => {
    const imageDelivery = createCIDImageDelivery();
    const exporter = createExporter(
      createDiagramBlockMapping({ renderDiagram, imageDelivery }),
    );

    const html = await exporter.toReactEmailDocument(diagramDocument);

    expect(html).toContain('src="cid:diagram-1@blocknote"');
    // The Mermaid source stays available as the alt text.
    expect(html).toContain('alt="graph TD');
    expect(imageDelivery.attachments).toHaveLength(1);
    expect(imageDelivery.attachments[0].contentType).toBe("image/png");
  });
});
