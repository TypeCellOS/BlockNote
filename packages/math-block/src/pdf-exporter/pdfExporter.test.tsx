import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
  ExportImage,
} from "@blocknote/core";
import {
  PDFExporter,
  pdfDefaultSchemaMappings,
} from "@blocknote/xl-pdf-exporter";
import { testDocumentWithSourceBlocks } from "@shared/testDocument.js";
import reactElementToJSXString from "react-element-to-jsx-string";
import { describe, expect, it } from "vite-plus/test";

import {
  createInlineMathMapping,
  inlineMathMapping,
  mathBlockMapping,
} from "./index.js";

// A stub rasterizer, standing in for e.g. @resvg/resvg-js on a server - the
// real (browser-only) rasterization is covered by the browser test suite.
const rasterize = async (svg: ExportImage) => ({
  mimeType: "image/png",
  data: new Uint8Array([0, 0, 0]),
  width: svg.width,
  height: svg.height,
});

function createExporter(
  inlineMath: ReturnType<typeof createInlineMathMapping>,
) {
  // Assembled outside the constructor call as the schema doesn't include
  // the math specs - like the default mappings, the math entries just map
  // the block JSON.
  const mappings = {
    ...pdfDefaultSchemaMappings,
    blockMapping: {
      ...pdfDefaultSchemaMappings.blockMapping,
      mathBlock: mathBlockMapping,
    },
    inlineContentMapping: {
      ...pdfDefaultSchemaMappings.inlineContentMapping,
      math: inlineMath,
    },
  };

  return new PDFExporter(
    BlockNoteSchema.create({
      blockSpecs: {
        ...defaultBlockSpecs,
        pageBreak: createPageBreakBlockSpec(),
      },
    }),
    mappings,
  );
}

describe("pdf exporter mappings", () => {
  it("should export math as formulas and inline math as images", async () => {
    const exporter = createExporter(createInlineMathMapping({ rasterize }));

    // The math block & inline math paragraph from the shared test document.
    const transformed = await exporter.toReactPDFDocument(
      testDocumentWithSourceBlocks.filter((block) =>
        ["math-block", "paragraph-with-inline-math"].includes(block.id),
      ),
    );
    const str = reactElementToJSXString(transformed);

    await expect(str).toMatchFileSnapshot(
      "__snapshots__/exampleWithMathMappings.jsx",
    );
  });

  it("should render error placeholders for invalid LaTeX", async () => {
    const exporter = createExporter(createInlineMathMapping({ rasterize }));

    const transformed = await exporter.toReactPDFDocument([
      {
        id: "1",
        type: "mathBlock",
        props: {},
        content: [{ type: "text", text: "\\invalidcommand{", styles: {} }],
        children: [],
      },
      {
        id: "2",
        type: "paragraph",
        props: {},
        content: [
          { type: "text", text: "Broken: ", styles: {} },
          { type: "math", props: {}, content: "\\invalidcommand{" },
        ],
        children: [],
      },
    ] as any);
    const str = reactElementToJSXString(transformed);

    // Mirrors the editor's error placeholder rather than dumping the LaTeX
    // source on readers - once for the block, once for the inline math.
    expect(str.match(/Invalid formula/g)).toHaveLength(2);
  });

  it("should render empty math as nothing", async () => {
    // Empty source isn't an error - there's just nothing to render (and no
    // rasterizer is needed).
    const exporter = createExporter(inlineMathMapping);

    const transformed = await exporter.toReactPDFDocument([
      { id: "1", type: "mathBlock", props: {}, content: [], children: [] },
      {
        id: "2",
        type: "paragraph",
        props: {},
        content: [{ type: "math", props: {}, content: "" }],
        children: [],
      },
    ] as any);
    const str = reactElementToJSXString(transformed);

    expect(str).not.toContain("Invalid formula");
    expect(str).not.toContain("Math");
  });

  it("should throw a descriptive error without a rasterizer outside the browser", async () => {
    // The default mapping's built-in rasterizer only works in the browser,
    // and silently degrading is worse than failing loudly - the error names
    // the `rasterize` option to pass.
    const exporter = createExporter(inlineMathMapping);

    await expect(
      exporter.toReactPDFDocument(
        testDocumentWithSourceBlocks.filter(
          (block) => block.id === "paragraph-with-inline-math",
        ),
      ),
    ).rejects.toThrow("pass a `rasterize` function");
  });
});
