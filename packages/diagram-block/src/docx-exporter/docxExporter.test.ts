import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { en } from "@blocknote/core/locales";
import {
  DOCXExporter,
  docxDefaultSchemaMappings,
} from "@blocknote/xl-docx-exporter";
import { BlobReader, ZipReader } from "@zip.js/zip.js";
import { Packer } from "docx";
import { beforeAll, describe, expect, it } from "vite-plus/test";

import {
  diagramDocument,
  renderInvalidDiagram,
  zipEntryContent,
} from "../exporterTestUtil.js";
import { createDiagramBlockMapping, diagramBlockMapping } from "./index.js";

beforeAll(async () => {
  // @ts-expect-error - Blob polyfill for Node test environment
  globalThis.Blob = (await import("node:buffer")).Blob;
});

function createExporter(
  diagram: ReturnType<typeof createDiagramBlockMapping>,
  options?: ConstructorParameters<typeof DOCXExporter>[2],
) {
  return new DOCXExporter(
    BlockNoteSchema.create({ blockSpecs: defaultBlockSpecs }),
    {
      ...docxDefaultSchemaMappings,
      blockMapping: {
        ...docxDefaultSchemaMappings.blockMapping,
        diagram,
      },
    } as any,
    options,
  );
}

const documentOptions = {
  sectionOptions: {},
  documentOptions: {},
  locale: "en-US",
} as any;

describe("docx exporter mappings", () => {
  it("should render an error placeholder for invalid sources", async () => {
    // The renderer returns invalid sources as a typed error, and the
    // mapping renders the error placeholder, identifying the diagram by the
    // source's first line.
    const exporter = createExporter(
      createDiagramBlockMapping({ renderDiagram: renderInvalidDiagram }),
    );

    const doc = await exporter.toDocxJsDocument(
      diagramDocument,
      documentOptions,
    );
    const documentXML = await zipEntryContent(
      await Packer.toBlob(doc),
      "word/document.xml",
    );

    expect(documentXML).toContain("Invalid diagram");
    expect(documentXML).toContain("graph TD");
    expect(documentXML).not.toContain("w:drawing");
  });

  it("should throw a descriptive error without a renderer outside the browser", async () => {
    // The built-in Mermaid renderer can't work here, and silently degrading
    // is worse than failing loudly - the error names the `renderDiagram`
    // option to pass.
    const exporter = createExporter(diagramBlockMapping);

    await expect(
      exporter.toDocxJsDocument(diagramDocument, documentOptions),
    ).rejects.toThrow("pass a `renderDiagram` function");
  });

  it("should render empty diagrams as an empty paragraph", async () => {
    // Empty source isn't an error - there's just nothing to render (and the
    // renderer is never invoked, so no browser is needed).
    const exporter = createExporter(diagramBlockMapping);

    const doc = await exporter.toDocxJsDocument(
      [
        {
          id: "1",
          type: "diagram",
          props: {},
          content: [],
          children: [],
        },
      ] as any,
      documentOptions,
    );
    const documentXML = await zipEntryContent(
      await Packer.toBlob(doc),
      "word/document.xml",
    );

    expect(documentXML).not.toContain("Invalid diagram");
    expect(documentXML).not.toContain("w:drawing");
  });

  it("should embed the image with the renderer's actual format", async () => {
    // Renderers aren't required to produce PNGs - the embed must carry the
    // format the image declares.
    const exporter = createExporter(
      createDiagramBlockMapping({
        renderDiagram: async () => ({
          image: {
            mimeType: "image/jpeg",
            data: new Uint8Array([0, 0, 0]),
            width: 100,
            height: 50,
          },
        }),
      }),
    );

    const doc = await exporter.toDocxJsDocument(
      diagramDocument,
      documentOptions,
    );
    const entries = await new ZipReader(
      new BlobReader(await Packer.toBlob(doc)),
    ).getEntries();

    expect(
      entries.some((entry) => /media\/.*\.jpe?g$/.test(entry.filename)),
    ).toBe(true);
  });

  it("should throw when the renderer produces a format DOCX can't embed", async () => {
    // An unknown format is a renderer contract violation - mislabeling the
    // bytes would corrupt the document, so it fails loudly instead.
    const exporter = createExporter(
      createDiagramBlockMapping({
        renderDiagram: async () => ({
          image: {
            mimeType: "image/webp",
            data: new Uint8Array([0, 0, 0]),
            width: 100,
            height: 50,
          },
        }),
      }),
    );

    await expect(
      exporter.toDocxJsDocument(diagramDocument, documentOptions),
    ).rejects.toThrow('renderer produced "image/webp"');
  });

  it("should scale wide diagrams down to the page width", async () => {
    // Word clips images wider than the body area at the right margin, so
    // the display size is clamped (1200x600 -> 600x300; EMU = px * 9525).
    const exporter = createExporter(
      createDiagramBlockMapping({
        renderDiagram: async () => ({
          image: {
            mimeType: "image/png",
            data: new Uint8Array([0, 0, 0]),
            width: 1200,
            height: 600,
          },
        }),
      }),
    );

    const doc = await exporter.toDocxJsDocument(
      diagramDocument,
      documentOptions,
    );
    const documentXML = await zipEntryContent(
      await Packer.toBlob(doc),
      "word/document.xml",
    );

    expect(documentXML).toContain('cx="5715000"');
    expect(documentXML).toContain('cy="2857500"');
  });

  it("should render placeholders from the configured dictionary", async () => {
    // Exporter strings are never hardcoded: the placeholder comes from the
    // `diagram` section of the exporter's dictionary, exactly as it would
    // from an editor dictionary (bundled English when not configured).
    const exporter = createExporter(
      createDiagramBlockMapping({ renderDiagram: renderInvalidDiagram }),
      {
        dictionary: {
          ...en,
          diagram: {
            exporter: {
              invalid_diagram: (source: string) =>
                `Ungültiges Diagramm „${source}"`,
            },
          },
        },
      },
    );

    const doc = await exporter.toDocxJsDocument(
      diagramDocument,
      documentOptions,
    );
    const documentXML = await zipEntryContent(
      await Packer.toBlob(doc),
      "word/document.xml",
    );

    expect(documentXML).toContain("Ungültiges Diagramm");
    expect(documentXML).not.toContain("Invalid diagram");
  });
});
