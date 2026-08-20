import { resolve } from "node:path";

import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import {
  TypstExporter,
  typstDefaultSchemaMappings,
} from "@blocknote/xl-pdf-renderer-2";
import { describe, expect, it } from "vite-plus/test";

import {
  diagramDocument,
  renderDiagram,
  renderDiagramSVG,
  renderInvalidDiagram,
} from "../exporterTestUtil.js";
import { createDiagramBlockMapping } from "./index.js";

function createExporter(
  options?: Parameters<typeof createDiagramBlockMapping>[0],
) {
  // Assembled outside the constructor call as the schema doesn't include
  // the diagram spec - like the default mappings, the diagram entry just
  // maps the block JSON.
  const mappings = {
    ...typstDefaultSchemaMappings,
    blockMapping: {
      ...typstDefaultSchemaMappings.blockMapping,
      diagram: createDiagramBlockMapping(options),
    },
  };
  return new TypstExporter(
    BlockNoteSchema.create({ blockSpecs: { ...defaultBlockSpecs } }),
    mappings,
  );
}

describe("typst exporter mappings", () => {
  it(
    "should export diagrams as figures with the source as alt text",
    { timeout: 20000 },
    async () => {
      const exporter = createExporter({ renderDiagram });

      const typst = await exporter.toTypst(diagramDocument, {
        title: "Diagram",
      });

      await expect(typst).toMatchFileSnapshot(
        "__snapshots__/withDiagramMappings/diagramDocument.typ",
      );

      // The rendered image is registered as a compiler asset.
      const assets = exporter.assetFiles;
      expect([...assets.keys()]).toEqual(["/assets/asset-0.png"]);

      // Compile under Typst's own PDF/UA-1 validation - it *errors* on
      // figures without alt text, so this proves the mapping's figures stay
      // UA-conformant end-to-end.
      const { NodeCompiler } =
        await import("@myriaddreamin/typst-ts-node-compiler");
      const compiler = NodeCompiler.create();
      for (const [path, bytes] of assets) {
        // The node compiler resolves a project-absolute Typst path
        // (`/assets/..`) against the cwd, so key the shadow by that resolved
        // absolute path (mirroring the xl-pdf-renderer-2 tests).
        compiler.mapShadow(
          resolve(process.cwd(), path.replace(/^\/+/, "")),
          Buffer.from(bytes),
        );
      }
      const pdf = compiler.pdf(
        { mainFileContent: typst },
        { pdfStandard: "ua-1" },
      );
      expect(pdf?.length).toBeGreaterThan(0);
    },
  );

  it(
    "should embed vector SVG renders and stay PDF/UA-1 conformant",
    { timeout: 20000 },
    async () => {
      // The browser default renderer produces SVG (`renderDiagramToSVG`);
      // this covers that path end-to-end with the SVG stub.
      const exporter = createExporter({ renderDiagram: renderDiagramSVG });

      const typst = await exporter.toTypst(diagramDocument, {
        title: "Diagram",
      });

      const assets = exporter.assetFiles;
      expect([...assets.keys()]).toEqual(["/assets/asset-0.svg"]);
      expect(typst).toContain('image("/assets/asset-0.svg"');

      const { NodeCompiler } =
        await import("@myriaddreamin/typst-ts-node-compiler");
      const compiler = NodeCompiler.create();
      for (const [path, bytes] of assets) {
        compiler.mapShadow(
          resolve(process.cwd(), path.replace(/^\/+/, "")),
          Buffer.from(bytes),
        );
      }
      const pdf = compiler.pdf(
        { mainFileContent: typst },
        { pdfStandard: "ua-1" },
      );
      expect(pdf?.length).toBeGreaterThan(0);
    },
  );

  it("should render an error placeholder for invalid sources", async () => {
    const exporter = createExporter({ renderDiagram: renderInvalidDiagram });

    const typst = await exporter.toTypst(diagramDocument);

    // The editor-style placeholder (identifying the diagram by its source's
    // first line), not the renderer's message - and no figure.
    expect(typst).toContain('Invalid diagram \\"graph TD');
    expect(typst).not.toContain("#figure");
    expect(exporter.assetFiles.size).toBe(0);
  });

  it("should require a renderer outside the browser", async () => {
    const exporter = createExporter();

    await expect(exporter.toTypst(diagramDocument)).rejects.toThrow(
      "pass a `renderDiagram` function",
    );
  });
});
