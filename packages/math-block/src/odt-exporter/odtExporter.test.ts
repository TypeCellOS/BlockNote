import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  defaultBlockSpecs,
} from "@blocknote/core";
import {
  ODTExporter,
  odtDefaultSchemaMappings,
} from "@blocknote/xl-odt-exporter";
import { testODTDocumentAgainstSnapshot } from "@shared/util/odtTestUtil.js";
import { testDocumentWithSourceBlocks } from "@shared/testDocument.js";
import { testResolveFileUrl } from "@shared/util/testFileResolver.js";
import { BlobReader, FileEntry, TextWriter, ZipReader } from "@zip.js/zip.js";
import { beforeAll, describe, expect, it } from "vite-plus/test";

import { inlineMathMapping, mathBlockMapping } from "./index.js";

beforeAll(async () => {
  // @ts-expect-error - Blob polyfill for Node test environment
  globalThis.Blob = (await import("node:buffer")).Blob;
});

describe("odt exporter mappings", () => {
  it("should render error placeholders for invalid LaTeX", async () => {
    // Assembled outside the constructor call as the schema doesn't include
    // the math specs - like the default mappings, the math entries just map
    // the block JSON.
    const mappings = {
      ...odtDefaultSchemaMappings,
      blockMapping: {
        ...odtDefaultSchemaMappings.blockMapping,
        mathBlock: mathBlockMapping,
      },
      inlineContentMapping: {
        ...odtDefaultSchemaMappings.inlineContentMapping,
        math: inlineMathMapping,
      },
    };
    const exporter = new ODTExporter(
      BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          pageBreak: createPageBreakBlockSpec(),
        },
      }),
      mappings,
      { resolveFileUrl: testResolveFileUrl },
    );

    const odt = await exporter.toODTDocument([
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
    const zipReader = new ZipReader(new BlobReader(odt));
    const entries = await zipReader.getEntries();
    const contentXML = entries.find(
      (entry) => entry.filename === "content.xml",
    ) as FileEntry;
    const content = await contentXML.getData(new TextWriter());

    // Mirrors the editor's error placeholder rather than dumping the LaTeX
    // source on readers - once for the block, once for the inline math.
    expect(content.match(/Invalid formula/g)).toHaveLength(2);
    expect(content).not.toContain("draw:object");
  });

  it("should export math as native formulas", { timeout: 10000 }, async () => {
    // Assembled outside the constructor call as the schema doesn't include
    // the math specs - like the default mappings, the math entries just
    // map the block JSON.
    const mappings = {
      ...odtDefaultSchemaMappings,
      blockMapping: {
        ...odtDefaultSchemaMappings.blockMapping,
        mathBlock: mathBlockMapping,
      },
      inlineContentMapping: {
        ...odtDefaultSchemaMappings.inlineContentMapping,
        math: inlineMathMapping,
      },
    };
    const exporter = new ODTExporter(
      BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          pageBreak: createPageBreakBlockSpec(),
        },
      }),
      mappings,
      { resolveFileUrl: testResolveFileUrl },
    );

    // The math block & inline math paragraph from the shared test document.
    const odt = await exporter.toODTDocument(
      testDocumentWithSourceBlocks.filter((block) =>
        ["math-block", "paragraph-with-inline-math"].includes(block.id),
      ),
    );
    // The math block & the inline math each embed one formula object.
    await testODTDocumentAgainstSnapshot(odt, {
      styles: "__snapshots__/withMathMappings/styles.xml",
      content: "__snapshots__/withMathMappings/content.xml",
      objects: {
        snapshot: "__snapshots__/withMathMappings/objects.xml",
        expectedCount: 2,
      },
    });
  });
});
