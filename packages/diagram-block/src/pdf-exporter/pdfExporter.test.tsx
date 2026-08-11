import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import {
  PDFExporter,
  pdfDefaultSchemaMappings,
} from "@blocknote/xl-pdf-exporter";
import reactElementToJSXString from "react-element-to-jsx-string";
import { describe, expect, it } from "vite-plus/test";

import {
  diagramDocument,
  renderDiagram,
  renderInvalidDiagram,
} from "../exporterTestUtil.js";
import { createDiagramBlockMapping, diagramBlockMapping } from "./index.js";

function createExporter(diagram: ReturnType<typeof createDiagramBlockMapping>) {
  const mappings = {
    ...pdfDefaultSchemaMappings,
    blockMapping: {
      ...pdfDefaultSchemaMappings.blockMapping,
      diagram,
    },
  };
  return new PDFExporter(
    BlockNoteSchema.create({ blockSpecs: defaultBlockSpecs }),
    mappings as any,
  );
}

describe("pdf exporter mappings", () => {
  it("should embed the rendered diagram as an image", async () => {
    const exporter = createExporter(
      createDiagramBlockMapping({ renderDiagram }),
    );

    const str = reactElementToJSXString(
      await exporter.toReactPDFDocument(diagramDocument),
    );

    expect(str).toContain("data:image/png;base64,");
    // 100px wide at 0.75 points per pixel.
    expect(str).toContain("width: 75");
  });

  it("should throw a descriptive error without a renderer outside the browser", async () => {
    const exporter = createExporter(diagramBlockMapping);

    await expect(exporter.toReactPDFDocument(diagramDocument)).rejects.toThrow(
      "pass a `renderDiagram` function",
    );
  });

  it("should render an error placeholder for invalid sources", async () => {
    // The renderer returns invalid sources as a typed error, and the
    // mapping renders the error placeholder - never the raw source.
    const exporter = createExporter(
      createDiagramBlockMapping({ renderDiagram: renderInvalidDiagram }),
    );

    const str = reactElementToJSXString(
      await exporter.toReactPDFDocument(diagramDocument),
    );

    expect(str).toContain("Invalid diagram");
    expect(str).toContain("graph TD");
    expect(str).not.toContain("data:image");
  });
});
