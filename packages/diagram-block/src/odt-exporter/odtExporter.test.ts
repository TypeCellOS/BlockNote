import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import {
  ODTExporter,
  odtDefaultSchemaMappings,
} from "@blocknote/xl-odt-exporter";
import { BlobReader, ZipReader } from "@zip.js/zip.js";
import { getImageDimensions } from "@shared/util/imageUtil.js";
import { beforeAll, describe, expect, it, vi } from "vite-plus/test";

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
  it("reads SVG dimensions without bitmap decoding", async () => {
    const decodeBitmap = vi.fn(() => {
      throw new Error("SVG bitmap decoding is not supported");
    });
    vi.stubGlobal("window", {});
    vi.stubGlobal("createImageBitmap", decodeBitmap);
    vi.stubEnv("NODE_ENV", "production");
    try {
      const svg = new Blob(
        ['<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"/>'],
        { type: "image/svg+xml" },
      );
      await expect(getImageDimensions(svg)).resolves.toEqual({
        width: 100,
        height: 50,
      });
      expect(decodeBitmap).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });

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

  it("should embed real vector diagrams outside the browser by default", async () => {
    expect(typeof document).toBe("undefined");
    const exporter = createExporter(diagramBlockMapping);
    const odt = await exporter.toODTDocument(diagramDocument);
    const reader = new ZipReader(new BlobReader(odt));
    const entries = await reader.getEntries();
    const svgEntry = entries.find((entry) =>
      /^Pictures\/.*\.svg$/.test(entry.filename),
    );
    expect(svgEntry).toBeDefined();
    if (!svgEntry) {
      throw new Error("SVG picture missing from exported ODT");
    }
    const svg = await zipEntryContent(odt, svgEntry.filename);
    expect(svg).toContain("pele-flowchart");
    expect(svg).not.toContain("foreignObject");
    const contentXML = await zipEntryContent(odt, "content.xml");
    expect(contentXML).toContain(`xlink:href="${svgEntry.filename}"`);
    expect(contentXML).toContain('draw:mime-type="image/svg+xml"');
    const manifest = await zipEntryContent(odt, "META-INF/manifest.xml");
    expect(manifest).toContain('manifest:media-type="image/svg+xml"');
    await reader.close();
  });
});
