import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import {
  ODTExporter,
  odtDefaultSchemaMappings,
} from "@blocknote/xl-odt-exporter";
import { BlobReader, ZipReader } from "@zip.js/zip.js";
import { beforeAll, describe, expect, it } from "vite-plus/test";

import {
  diagramDocument,
  renderDiagram,
  renderInvalidDiagram,
  zipEntryContent,
} from "../exporterTestUtil.js";
import { createDiagramBlockMapping, diagramBlockMapping } from "./index.js";

beforeAll(async () => {
  // @ts-expect-error - Blob polyfill for Node test environment
  globalThis.Blob = (await import("node:buffer")).Blob;
});

function createExporter(diagram: ReturnType<typeof createDiagramBlockMapping>) {
  const mappings = {
    ...odtDefaultSchemaMappings,
    blockMapping: {
      ...odtDefaultSchemaMappings.blockMapping,
      diagram,
    },
  };
  return new ODTExporter(
    BlockNoteSchema.create({ blockSpecs: defaultBlockSpecs }),
    mappings as any,
  );
}

describe("odt exporter mappings", () => {
  it("should embed the rendered diagram as an image", async () => {
    const exporter = createExporter(
      createDiagramBlockMapping({ renderDiagram }),
    );

    const odt = await exporter.toODTDocument(diagramDocument);
    const contentXML = await zipEntryContent(odt, "content.xml");

    expect(contentXML).toContain("draw:image");
    // The picture bytes are stored as their own zip entry.
    const entries = await new ZipReader(new BlobReader(odt)).getEntries();
    expect(
      entries.some((entry) => entry.filename.startsWith("Pictures/")),
    ).toBe(true);
  });

  it("should render an error placeholder for invalid sources", async () => {
    // The renderer returns invalid sources as a typed error, and the
    // mapping renders the error placeholder - never the raw source.
    const exporter = createExporter(
      createDiagramBlockMapping({ renderDiagram: renderInvalidDiagram }),
    );

    const contentXML = await zipEntryContent(
      await exporter.toODTDocument(diagramDocument),
      "content.xml",
    );

    expect(contentXML).toContain("Invalid diagram");
    expect(contentXML).toContain("graph TD");
    expect(contentXML).not.toContain("draw:image");
  });

  it("should throw a descriptive error without a renderer outside the browser", async () => {
    const exporter = createExporter(diagramBlockMapping);

    await expect(exporter.toODTDocument(diagramDocument)).rejects.toThrow(
      "pass a `renderDiagram` function",
    );
  });
});
